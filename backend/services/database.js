const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Local JSON DB configuration
const localDbDir = path.join(__dirname, '..', 'data');
const localDbPath = path.join(localDbDir, 'db.json');

let localData = {
  friends: {},
  submissions: {}
};

let useMongoDB = false;
let client = null;
let db = null;

// Initialize Database Connection
async function initialize() {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    try {
      console.log("[DB] Connecting to MongoDB Atlas...");
      client = new MongoClient(uri);
      await client.connect();
      db = client.db('codepulse');
      useMongoDB = true;
      console.log("[DB] MongoDB Atlas connected successfully.");
      
      // Ensure indexes for fast sorting
      await db.collection('submissions').createIndex({ timestamp: -1 });
      await db.collection('submissions').createIndex({ id: 1 }, { unique: true });
      await db.collection('friends').createIndex({ id: 1 }, { unique: true });
      return;
    } catch (error) {
      console.error("[DB] Failed to connect to MongoDB Atlas, falling back to local database.", error);
    }
  }

  // Fallback to Local JSON Database
  console.log("[DB] Using local JSON database.");
  if (!fs.existsSync(localDbDir)) {
    fs.mkdirSync(localDbDir, { recursive: true });
  }

  if (fs.existsSync(localDbPath)) {
    try {
      const fileData = fs.readFileSync(localDbPath, 'utf8');
      localData = JSON.parse(fileData);
      localData.friends = localData.friends || {};
      localData.submissions = localData.submissions || {};
    } catch (error) {
      console.error("[DB] Error reading local db.json, creating a new one.", error);
      saveLocalDb();
    }
  } else {
    saveLocalDb();
  }
}

// Utility to write local data cache to file
function saveLocalDb() {
  try {
    fs.writeFileSync(localDbPath, JSON.stringify(localData, null, 2), 'utf8');
  } catch (error) {
    console.error("[DB] Error writing to local db.json", error);
  }
}

// 1. Get Friends
async function getFriends() {
  if (useMongoDB) {
    const list = await db.collection('friends').find({}).toArray();
    const friends = {};
    list.forEach(item => {
      friends[item.id] = item;
    });
    return friends;
  } else {
    return localData.friends;
  }
}

// 2. Update Friend
async function updateFriend(friendId, data) {
  const updatedFriend = {
    id: friendId,
    ...data,
    updatedAt: new Date().toISOString()
  };

  if (useMongoDB) {
    const updateDoc = { ...updatedFriend };
    delete updateDoc._id; // Remove _id if present to avoid updating immutable fields
    
    await db.collection('friends').updateOne(
      { id: friendId },
      { $set: updateDoc },
      { upsert: true }
    );
  } else {
    localData.friends[friendId] = {
      ...(localData.friends[friendId] || {}),
      ...updatedFriend
    };
    saveLocalDb();
  }
  return updatedFriend;
}

// 3. Save Submission
async function saveSubmission(submission) {
  const submissionData = {
    ...submission,
    detectedAt: new Date().toISOString()
  };

  if (useMongoDB) {
    const updateDoc = { ...submissionData };
    delete updateDoc._id; // Remove _id if present to avoid updating immutable fields
    
    await db.collection('submissions').updateOne(
      { id: submission.id },
      { $set: updateDoc },
      { upsert: true }
    );
  } else {
    localData.submissions[submission.id] = submissionData;
    saveLocalDb();
  }
  return submissionData;
}

// 4. Check if Submission has been processed
async function isSubmissionProcessed(submissionId) {
  if (useMongoDB) {
    const doc = await db.collection('submissions').findOne({ id: submissionId });
    return !!doc;
  } else {
    return !!localData.submissions[submissionId];
  }
}

// 5. Get Recent Submissions
async function getRecentSubmissions(limit = 20) {
  if (useMongoDB) {
    return await db.collection('submissions')
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  } else {
    return Object.values(localData.submissions)
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
      .slice(0, limit);
  }
}

// 6. Get Stats
async function getStats() {
  const friends = await getFriends();
  const friendsList = Object.values(friends);
  const friendsTracked = friendsList.length;

  let submissionsList = [];
  if (useMongoDB) {
    submissionsList = await db.collection('submissions').find({}).toArray();
  } else {
    submissionsList = Object.values(localData.submissions);
  }

  // Get timestamps for start of today (local time)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodaySecs = Math.floor(startOfToday.getTime() / 1000);

  // Submissions solved today (accepted)
  const activitiesTodayList = submissionsList.filter(s => 
    s.timestamp >= startOfTodaySecs && 
    (s.statusDisplay === 'Accepted' || s.statusDisplay === 'solved')
  );
  const activitiesToday = activitiesTodayList.length;

  // Notifications sent today
  const notificationsSentToday = submissionsList.filter(s => 
    s.timestamp >= startOfTodaySecs && s.notified === true
  ).length;

  // Most Active Friend
  const counts = {};
  submissionsList.forEach(s => {
    counts[s.friendId] = (counts[s.friendId] || 0) + 1;
  });

  let mostActiveFriendId = "None";
  let maxCount = 0;
  Object.keys(counts).forEach(id => {
    if (counts[id] > maxCount) {
      maxCount = counts[id];
      mostActiveFriendId = id;
    }
  });

  let mostActiveFriend = "None";
  if (mostActiveFriendId !== "None") {
    const friend = friends[mostActiveFriendId];
    mostActiveFriend = friend ? (friend.displayName || friend.username) : mostActiveFriendId;
  }

  return {
    friendsTracked,
    activitiesToday,
    notificationsSentToday,
    mostActiveFriend
  };
}

module.exports = {
  initialize,
  getFriends,
  updateFriend,
  saveSubmission,
  isSubmissionProcessed,
  getRecentSubmissions,
  getStats
};
