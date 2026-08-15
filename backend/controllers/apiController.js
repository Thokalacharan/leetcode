const database = require('../services/database');
const tracker = require('../services/tracker');
const aiAssistant = require('../services/aiAssistant');

// 1. Get Friends Status List
async function getFriends(req, res, next) {
  try {
    const friends = await database.getFriends();
    res.json(Object.values(friends));
  } catch (error) {
    next(error);
  }
}

// 2. Add a new Friend dynamically
async function addFriend(req, res, next) {
  try {
    const { displayName, profileUrl } = req.body;
    if (!profileUrl) {
      return res.status(400).json({ error: "LeetCode Profile URL or username is required." });
    }

    const friend = await tracker.addNewFriend(displayName, profileUrl);
    res.status(201).json({ success: true, friend });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// 3. Delete a Friend
async function deleteFriend(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Friend ID is required." });
    }

    const result = await tracker.removeFriend(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// 4. Update a Friend (e.g. Display Name)
async function updateFriend(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (!id) {
      return res.status(400).json({ error: "Friend ID is required." });
    }

    const updated = await tracker.editFriend(id, updates);
    res.json({ success: true, friend: updated });
  } catch (error) {
    next(error);
  }
}

// 5. Get Recent Activities
async function getActivity(req, res, next) {
  try {
    const activity = await database.getRecentSubmissions(25);
    res.json(activity);
  } catch (error) {
    next(error);
  }
}

// 6. Get Dashboard Stats
async function getStats(req, res, next) {
  try {
    const stats = await database.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

// 7. Force Scan Now
async function checkNow(req, res, next) {
  try {
    const result = await tracker.scanNow();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// 8. AI Problem Finder Chat
async function askAI(req, res, next) {
  try {
    const { message, apiKey } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message query is required." });
    }

    const response = await aiAssistant.answerProblemQuery(message, apiKey);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 9. Test Email Trigger
async function testEmail(req, res, next) {
  try {
    const email = require('../services/email');
    const result = await email.sendSubmissionNotification(
      "Charan Test",
      "Add Binary",
      "67",
      "Easy",
      Math.floor(Date.now() / 1000),
      "add-binary",
      "2107938952",
      "CHARAN_THOKALA"
    );
    res.json({ success: true, result, sentTo: process.env.EMAIL_TO, configuredUser: process.env.EMAIL_USER });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getFriends,
  addFriend,
  deleteFriend,
  updateFriend,
  getActivity,
  getStats,
  checkNow,
  askAI,
  testEmail
};
