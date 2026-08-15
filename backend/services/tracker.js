const database = require('./database');
const leetcode = require('./leetcode');
const email = require('./email');

let intervalId = null;
let isScanning = false;

// Parse username from a LeetCode profile URL or raw username string
function extractUsername(input) {
  if (!input) return null;
  let clean = input.trim().replace(/\/$/, "");
  
  // Match leetcode.com/u/username or leetcode.com/username
  let match = clean.match(/\/u\/([a-zA-Z0-9_\-]+)/);
  if (match) return match[1];
  
  match = clean.match(/leetcode\.com\/([a-zA-Z0-9_\-]+)/);
  if (match) return match[1];
  
  // Match plain username
  if (/^[a-zA-Z0-9_\-]+$/.test(clean)) {
    return clean;
  }
  
  return null;
}

// Get friends configured from .env variables dynamically
function getConfiguredFriends() {
  const friends = [];
  const envKeys = Object.keys(process.env);
  
  envKeys.forEach(key => {
    const match = key.match(/^FRIEND_(\d+)_URL$/i);
    if (match) {
      const idx = match[1];
      const url = process.env[key];
      const name = process.env[`FRIEND_${idx}_NAME`];
      
      if (url) {
        const username = extractUsername(url);
        if (username) {
          friends.push({
            id: username.toLowerCase(),
            username,
            displayName: name || username,
            profileUrl: `https://leetcode.com/u/${username}/`
          });
        }
      }
    }
  });
  return friends;
}

const DEFAULT_INITIAL_FRIENDS = [
  { username: "rakesh_regala", displayName: "Rakesh" },
  { username: "prakash-2736", displayName: "I.Prakash" },
  { username: "shaikmsameer", displayName: "Sameer" },
  { username: "aETewnRn28", displayName: "Vyshnavi" },
  { username: "Leela_338", displayName: "Leela" },
  { username: "peramdurgashankar18", displayName: "shankar" },
  { username: "Jeshva-Praveen", displayName: "Praveen" }
];

// Merge env-configured friends and database friends
async function getAllTrackableFriends() {
  const dbFriends = await database.getFriends();
  const envFriends = getConfiguredFriends();
  
  const map = new Map();
  
  // Add database stored friends first
  Object.values(dbFriends).forEach(f => {
    if (f && f.id) {
      map.set(f.id, f);
    }
  });

  // Seed with env friends if not already present in DB
  for (const envF of envFriends) {
    if (!map.has(envF.id)) {
      map.set(envF.id, envF);
    }
  }

  // If database is currently completely empty, automatically seed initial friend roster
  if (map.size === 0) {
    console.log("[Tracker] Empty friends database detected. Seeding with initial friend list...");
    for (const defF of DEFAULT_INITIAL_FRIENDS) {
      const friendObj = {
        id: defF.username.toLowerCase(),
        username: defF.username,
        displayName: defF.displayName,
        profileUrl: `https://leetcode.com/u/${defF.username}/`,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await database.updateFriend(friendObj.id, friendObj);
      map.set(friendObj.id, friendObj);
    }
  }

  return Array.from(map.values());
}

// Add a new friend dynamically (from Dashboard or API)
async function addNewFriend(displayName, profileUrlOrUsername) {
  const username = extractUsername(profileUrlOrUsername);
  if (!username) {
    throw new Error("Invalid LeetCode Profile URL or username. Example: https://leetcode.com/u/username/ or username");
  }

  const friendId = username.toLowerCase();
  const profileUrl = `https://leetcode.com/u/${username}/`;
  const name = displayName && displayName.trim() ? displayName.trim() : username;

  console.log(`[Tracker] Adding new friend: ${name} (${username})...`);

  // 1. Fetch user profile from LeetCode GraphQL
  const profile = await leetcode.fetchUserProfile(username);
  
  const friendData = {
    id: friendId,
    username: username,
    displayName: name,
    profileUrl: profileUrl,
    avatar: profile ? profile.avatar : "https://assets.leetcode.com/users/default_avatar.png",
    ranking: profile ? profile.ranking : null,
    totalSolved: profile ? profile.totalSolved : 0,
    easySolved: profile ? profile.easySolved : 0,
    mediumSolved: profile ? profile.mediumSolved : 0,
    hardSolved: profile ? profile.hardSolved : 0,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 2. Fetch recent submissions to establish baseline without spamming emails
  const submissions = await leetcode.fetchRecentAcceptedSubmissions(username, 5);
  if (submissions && submissions.length > 0) {
    console.log(`[Tracker] Storing ${submissions.length} baseline submission(s) for newly added friend ${name}`);
    for (const sub of submissions) {
      const details = await leetcode.fetchQuestionDetails(sub.titleSlug);
      await database.saveSubmission({
        id: sub.id,
        friendId: friendId,
        friendDisplayName: name,
        problemTitle: sub.title,
        problemSlug: sub.titleSlug,
        questionId: details.questionId,
        difficulty: details.difficulty,
        timestamp: Number(sub.timestamp),
        statusDisplay: "Accepted",
        lang: "Unknown",
        notified: false
      });
    }

    const latest = submissions[0];
    const latestDetails = await leetcode.fetchQuestionDetails(latest.titleSlug);
    friendData.lastActiveTime = Number(latest.timestamp);
    friendData.lastProblemTitle = latest.title;
    friendData.lastProblemSlug = latest.titleSlug;
    friendData.lastProblemDifficulty = latestDetails.difficulty;
  }

  // 3. Save to database
  const saved = await database.updateFriend(friendId, friendData);
  console.log(`[Tracker] Friend ${name} successfully added and saved to database.`);
  return saved;
}

// Delete a friend
async function removeFriend(friendId) {
  const cleanId = (friendId || '').toLowerCase().trim();
  console.log(`[Tracker] Removing friend: ${cleanId}`);
  return await database.deleteFriend(cleanId);
}

// Edit a friend's details (e.g. display name)
async function editFriend(friendId, updates) {
  const cleanId = (friendId || '').toLowerCase().trim();
  console.log(`[Tracker] Updating friend: ${cleanId}`);
  return await database.updateFriend(cleanId, updates);
}

// Perform active checks for all friends
async function scanFriendsActivity() {
  if (isScanning) {
    console.log("[Tracker] Scan is already running. Skipping...");
    return { success: false, message: "Scan already in progress." };
  }

  isScanning = true;
  console.log(`[Tracker] [${new Date().toLocaleTimeString()}] Starting activity check...`);
  
  try {
    const friendsToScan = await getAllTrackableFriends();
    const dbFriends = await database.getFriends();
    
    for (const friend of friendsToScan) {
      try {
        console.log(`[Tracker] Checking ${friend.displayName} (${friend.username})...`);
        
        // 1. Fetch user profile from LeetCode to update stats
        const profile = await leetcode.fetchUserProfile(friend.username);
        let existingFriend = dbFriends[friend.id];
        
        // Determine if this is the first time we track this friend in our DB
        const isFirstTime = !existingFriend;

        let updatedFriendDetails = {
          username: friend.username,
          displayName: friend.displayName || friend.username,
          profileUrl: friend.profileUrl || `https://leetcode.com/u/${friend.username}/`,
          updatedAt: new Date().toISOString()
        };

        if (profile) {
          updatedFriendDetails = {
            ...updatedFriendDetails,
            avatar: profile.avatar,
            ranking: profile.ranking,
            totalSolved: profile.totalSolved,
            easySolved: profile.easySolved,
            mediumSolved: profile.mediumSolved,
            hardSolved: profile.hardSolved,
            status: "active"
          };
        } else {
          updatedFriendDetails.status = existingFriend ? existingFriend.status : "inactive";
          if (existingFriend) {
            updatedFriendDetails.avatar = existingFriend.avatar;
            updatedFriendDetails.ranking = existingFriend.ranking;
            updatedFriendDetails.totalSolved = existingFriend.totalSolved;
            updatedFriendDetails.easySolved = existingFriend.easySolved;
            updatedFriendDetails.mediumSolved = existingFriend.mediumSolved;
            updatedFriendDetails.hardSolved = existingFriend.hardSolved;
          }
        }

        // 2. Fetch recent submissions from LeetCode
        const submissions = await leetcode.fetchRecentAcceptedSubmissions(friend.username, 5);
        
        if (submissions.length > 0) {
          if (isFirstTime) {
            console.log(`[Tracker] First time tracking ${friend.displayName}. Creating baseline with ${submissions.length} submission(s) without notification.`);
            
            for (let i = 0; i < submissions.length; i++) {
              const sub = submissions[i];
              const details = await leetcode.fetchQuestionDetails(sub.titleSlug);
              
              await database.saveSubmission({
                id: sub.id,
                friendId: friend.id,
                friendDisplayName: friend.displayName || friend.username,
                problemTitle: sub.title,
                problemSlug: sub.titleSlug,
                questionId: details.questionId,
                difficulty: details.difficulty,
                timestamp: Number(sub.timestamp),
                statusDisplay: "Accepted",
                lang: "Unknown",
                notified: false
              });
            }

            const latestSub = submissions[0];
            const latestDetails = await leetcode.fetchQuestionDetails(latestSub.titleSlug);
            updatedFriendDetails.lastActiveTime = Number(latestSub.timestamp);
            updatedFriendDetails.lastProblemTitle = latestSub.title;
            updatedFriendDetails.lastProblemSlug = latestSub.titleSlug;
            updatedFriendDetails.lastProblemDifficulty = latestDetails.difficulty;
            updatedFriendDetails.status = "active";

          } else {
            // Process recent submissions to find genuinely new ones
            const newSubmissions = [];
            for (const sub of submissions) {
              const isProcessed = await database.isSubmissionProcessed(sub.id);
              const isNewer = !existingFriend.lastActiveTime || Number(sub.timestamp) > existingFriend.lastActiveTime;

              if (!isProcessed && isNewer) {
                newSubmissions.push(sub);
              }
            }

            // Reverse to process chronologically (oldest to newest)
            newSubmissions.reverse();

            if (newSubmissions.length > 0) {
              console.log(`[Tracker] Detected ${newSubmissions.length} new submission(s) for ${friend.displayName}!`);
              
              for (const sub of newSubmissions) {
                const details = await leetcode.fetchQuestionDetails(sub.titleSlug);
                
                // Send Email Notification
                let emailSent = false;
                try {
                  const mailRes = await email.sendSubmissionNotification(
                    friend.displayName || friend.username,
                    sub.title,
                    details.questionId,
                    details.difficulty,
                    sub.timestamp,
                    sub.titleSlug,
                    sub.id,
                    friend.username
                  );
                  emailSent = mailRes.success;
                } catch (mailError) {
                  console.error(`[Tracker] Failed to send email for ${friend.displayName}:`, mailError.message);
                }

                // Save to database
                await database.saveSubmission({
                  id: sub.id,
                  friendId: friend.id,
                  friendDisplayName: friend.displayName || friend.username,
                  problemTitle: sub.title,
                  problemSlug: sub.titleSlug,
                  questionId: details.questionId,
                  difficulty: details.difficulty,
                  timestamp: Number(sub.timestamp),
                  statusDisplay: "Accepted",
                  lang: "Unknown",
                  notified: emailSent
                });

                // Update last active details
                updatedFriendDetails.lastActiveTime = Number(sub.timestamp);
                updatedFriendDetails.lastProblemTitle = sub.title;
                updatedFriendDetails.lastProblemSlug = sub.titleSlug;
                updatedFriendDetails.lastProblemDifficulty = details.difficulty;
                updatedFriendDetails.status = "active";
              }
            } else {
              console.log(`[Tracker] No new activity for ${friend.displayName}.`);
            }
          }
        } else {
          console.log(`[Tracker] No recent submissions returned for ${friend.displayName}.`);
          if (existingFriend && existingFriend.lastActiveTime) {
            const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
            if (existingFriend.lastActiveTime < sevenDaysAgo) {
              updatedFriendDetails.status = "inactive";
            }
          }
        }

        // Update friend in DB with latest stats
        await database.updateFriend(friend.id, updatedFriendDetails);

      } catch (friendError) {
        console.error(`[Tracker] Error checking activity for ${friend.displayName}:`, friendError.message);
      }
    }
    
    console.log(`[Tracker] Activity check complete.`);
    return { success: true, message: "Activity check completed." };
  } finally {
    isScanning = false;
  }
}

// Simulate a mock friend solving a problem for developer testing
async function triggerMockSubmission(friendId, problemTitle, difficulty, statusDisplay = "Accepted") {
  console.log(`[Tracker] Triggering mock submission for ${friendId}: ${problemTitle} (${difficulty})...`);
  
  const dbFriends = await database.getFriends();
  let friend = dbFriends[friendId];
  
  if (!friend) {
    friend = await database.updateFriend(friendId, {
      id: friendId,
      username: friendId,
      displayName: friendId.charAt(0).toUpperCase() + friendId.slice(1),
      profileUrl: `https://leetcode.com/u/${friendId}/`,
      avatar: "https://assets.leetcode.com/users/default_avatar.png",
      ranking: null,
      status: "active"
    });
  }

  const submissionId = "mock_" + Math.floor(Math.random() * 1000000000);
  const timestamp = Math.floor(Date.now() / 1000);
  const problemSlug = problemTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

  // Fetch real details dynamically from LeetCode GraphQL
  const details = await leetcode.fetchQuestionDetails(problemSlug);
  const resolvedDifficulty = (details && details.difficulty !== 'Unknown') ? details.difficulty : (difficulty || 'Easy');
  const resolvedQuestionId = (details && details.questionId !== 'Unknown') ? details.questionId : String(Math.floor(Math.random() * 2500) + 1);

  // Trigger Email
  let emailSent = false;
  try {
    const mailRes = await email.sendSubmissionNotification(
      friend.displayName || friend.username,
      problemTitle,
      resolvedQuestionId,
      resolvedDifficulty,
      timestamp,
      problemSlug,
      submissionId
    );
    emailSent = mailRes.success;
  } catch (mailError) {
    console.error(`[Tracker] Mock email trigger failed:`, mailError.message);
  }

  // Save to database
  const submissionData = await database.saveSubmission({
    id: submissionId,
    friendId: friend.id,
    friendDisplayName: friend.displayName || friend.username,
    problemTitle,
    problemSlug,
    questionId: resolvedQuestionId,
    difficulty: resolvedDifficulty,
    timestamp,
    statusDisplay,
    lang: "python3",
    notified: emailSent
  });

  // Update friend active status
  await database.updateFriend(friend.id, {
    lastActiveTime: timestamp,
    lastProblemTitle: problemTitle,
    lastProblemSlug: problemSlug,
    lastProblemDifficulty: resolvedDifficulty,
    status: "active"
  });

  return {
    success: true,
    submission: submissionData
  };
}

// Start scheduling interval
function start() {
  const intervalMinutes = parseFloat(process.env.CHECK_INTERVAL_MINUTES) || 0.5;
  const intervalMs = intervalMinutes * 60 * 1000;
  
  console.log(`[Tracker] Starting activity tracker. Check interval: ${intervalMinutes} minutes.`);
  
  // Run an initial scan after database is initialized (done in server.js)
  setTimeout(() => {
    scanFriendsActivity();
  }, 3000);

  // Set periodic interval
  intervalId = setInterval(() => {
    scanFriendsActivity();
  }, intervalMs);
}

// Stop scheduler
function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[Tracker] Stopped activity tracker.");
  }
}

module.exports = {
  start,
  stop,
  scanNow: scanFriendsActivity,
  addNewFriend,
  removeFriend,
  editFriend,
  triggerMockSubmission,
  extractUsername
};
