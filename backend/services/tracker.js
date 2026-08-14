const database = require('./database');
const leetcode = require('./leetcode');
const email = require('./email');

let intervalId = null;
let isScanning = false;

// Parse username from a LeetCode profile URL
function extractUsername(url) {
  if (!url) return null;
  // Clean trailing slash
  let cleanUrl = url.trim().replace(/\/$/, "");
  // Match leetcode.com/u/username or leetcode.com/username
  let match = cleanUrl.match(/\/u\/([a-zA-Z0-9_\-]+)/);
  if (match) return match[1];
  
  match = cleanUrl.match(/leetcode\.com\/([a-zA-Z0-9_\-]+)/);
  if (match) return match[1];
  
  return null;
}

// Get the configured list of friends from environment variables
function getConfiguredFriends() {
  const friends = [];
  for (let i = 1; i <= 7; i++) {
    const name = process.env[`FRIEND_${i}_NAME`] || `Friend ${i}`;
    const url = process.env[`FRIEND_${i}_URL`];
    
    if (url) {
      const username = extractUsername(url);
      if (username) {
        friends.push({
          id: username.toLowerCase(),
          username,
          displayName: name,
          profileUrl: url
        });
      } else {
        console.warn(`[Tracker] Could not extract username for friend ${name} from URL: ${url}`);
      }
    }
  }
  return friends;
}

// Perform active checks for all friends
async function scanFriendsActivity() {
  if (isScanning) {
    console.log("[Tracker] Scan is already running. Skipping...");
    return { success: false, message: "Scan already in progress." };
  }

  isScanning = true;
  console.log(`[Tracker] [${new Date().toLocaleTimeString()}] Starting activity check...`);
  
  const configuredFriends = getConfiguredFriends();
  const dbFriends = await database.getFriends();
  
  for (const friend of configuredFriends) {
    try {
      console.log(`[Tracker] Checking ${friend.displayName} (${friend.username})...`);
      
      // 1. Fetch user profile from LeetCode to update stats
      const profile = await leetcode.fetchUserProfile(friend.username);
      let existingFriend = dbFriends[friend.id];
      
      // Determine if this is the first time we track this friend in our DB
      const isFirstTime = !existingFriend;

      let updatedFriendDetails = {
        username: friend.username,
        displayName: friend.displayName,
        profileUrl: friend.profileUrl,
        updatedAt: new Date().toISOString()
      };

      if (profile) {
        updatedFriendDetails = {
          ...updatedFriendDetails,
          avatar: profile.avatar,
          ranking: profile.ranking,
          status: "active"
        };
      } else {
        console.warn(`[Tracker] Profile details temporarily unavailable for ${friend.username}`);
        // Maintain local profile cache or mark inactive if never loaded
        updatedFriendDetails.status = existingFriend ? existingFriend.status : "inactive";
        if (existingFriend) {
          updatedFriendDetails.avatar = existingFriend.avatar;
          updatedFriendDetails.ranking = existingFriend.ranking;
        }
      }

      // Update friend in DB
      existingFriend = await database.updateFriend(friend.id, updatedFriendDetails);

      // 2. Fetch recent submissions from LeetCode
      const submissions = await leetcode.fetchRecentAcceptedSubmissions(friend.username, 5);
      
      if (submissions.length > 0) {
        if (isFirstTime) {
          console.log(`[Tracker] First time tracking ${friend.displayName}. Creating baseline with ${submissions.length} submission(s) without notification.`);
          
          // Save all fetched submissions to database as processed (notified: false)
          for (let i = 0; i < submissions.length; i++) {
            const sub = submissions[i];
            const details = await leetcode.fetchQuestionDetails(sub.titleSlug);
            
            await database.saveSubmission({
              id: sub.id,
              friendId: friend.id,
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

          // Update friend's last activity baseline
          const latestSub = submissions[0];
          await database.updateFriend(friend.id, {
            lastActiveTime: Number(latestSub.timestamp),
            lastProblemTitle: latestSub.title,
            lastProblemSlug: latestSub.titleSlug,
            status: "active"
          });

        } else {
          // Process recent submissions to find genuinely new ones
          // LeetCode returns submissions sorted descending by timestamp, so we process oldest-to-newest
          // to trigger emails in chronological order.
          const newSubmissions = [];
          for (const sub of submissions) {
            const isProcessed = await database.isSubmissionProcessed(sub.id);
            // Also check if timestamp is newer than friend's recorded lastActiveTime
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
                  friend.displayName,
                  sub.title,
                  details.questionId,
                  details.difficulty,
                  sub.timestamp,
                  sub.titleSlug
                );
                emailSent = mailRes.success;
              } catch (mailError) {
                console.error(`[Tracker] Failed to send email for ${friend.displayName}:`, mailError.message);
              }

              // Save to database
              await database.saveSubmission({
                id: sub.id,
                friendId: friend.id,
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
              await database.updateFriend(friend.id, {
                lastActiveTime: Number(sub.timestamp),
                lastProblemTitle: sub.title,
                lastProblemSlug: sub.titleSlug,
                status: "active"
              });
            }
          } else {
            console.log(`[Tracker] No new activity for ${friend.displayName}.`);
          }
        }
      } else {
        console.log(`[Tracker] No recent submissions returned for ${friend.displayName}.`);
        // If the user was active, check if they have become inactive (e.g. no activity in 7 days)
        if (existingFriend && existingFriend.lastActiveTime) {
          const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
          if (existingFriend.lastActiveTime < sevenDaysAgo) {
            await database.updateFriend(friend.id, { status: "inactive" });
          }
        }
      }
    } catch (friendError) {
      console.error(`[Tracker] Error checking activity for ${friend.displayName}:`, friendError.message);
    }
  }

  isScanning = false;
  console.log(`[Tracker] Activity check complete.`);
  return { success: true, message: "Activity check completed." };
}

// Simulate a mock friend solving a problem for developer testing
async function triggerMockSubmission(friendId, problemTitle, difficulty, statusDisplay = "Accepted") {
  console.log(`[Tracker] Triggering mock submission for ${friendId}: ${problemTitle} (${difficulty})...`);
  
  // Make sure friend exists in DB, or create them
  const dbFriends = await database.getFriends();
  let friend = dbFriends[friendId];
  
  if (!friend) {
    // Initialize standard mock friend
    friend = await database.updateFriend(friendId, {
      username: friendId,
      displayName: friendId.charAt(0).toUpperCase() + friendId.slice(1),
      profileUrl: `https://leetcode.com/u/${friendId}/`,
      avatar: "https://assets.leetcode.com/users/default_avatar.png",
      ranking: 99999,
      status: "active"
    });
  }

  const submissionId = "mock_" + Math.floor(Math.random() * 1000000000);
  const timestamp = Math.floor(Date.now() / 1000);
  const problemSlug = problemTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Map popular simulation problem names to actual question numbers
  let questionId = "1";
  const nameLower = problemTitle.toLowerCase();
  if (nameLower.includes("two sum")) questionId = "1";
  else if (nameLower.includes("lru cache")) questionId = "146";
  else if (nameLower.includes("longest substring")) questionId = "3";
  else if (nameLower.includes("word search")) questionId = "79";
  else if (nameLower.includes("rotate image")) questionId = "48";
  else if (nameLower.includes("merge k sorted")) questionId = "23";
  else if (nameLower.includes("climbing stairs")) questionId = "70";
  else if (nameLower.includes("best time to buy")) questionId = "121";
  else questionId = String(Math.floor(Math.random() * 2000) + 1);

  // Trigger Email
  let emailSent = false;
  try {
    const mailRes = await email.sendSubmissionNotification(
      friend.displayName,
      problemTitle,
      questionId,
      difficulty,
      timestamp,
      problemSlug
    );
    emailSent = mailRes.success;
  } catch (mailError) {
    console.error(`[Tracker] Mock email trigger failed:`, mailError.message);
  }

  // Save to database
  const submissionData = await database.saveSubmission({
    id: submissionId,
    friendId: friend.id,
    problemTitle,
    problemSlug,
    questionId,
    difficulty,
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
    status: "active"
  });

  return {
    success: true,
    submission: submissionData
  };
}

// Start scheduling interval
function start() {
  const intervalMinutes = parseFloat(process.env.CHECK_INTERVAL_MINUTES) || 5;
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
  triggerMockSubmission
};
