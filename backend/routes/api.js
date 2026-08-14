const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

// --- Friends Management Routes ---
router.get('/friends', apiController.getFriends);
router.post('/friends', apiController.addFriend);
router.delete('/friends/:id', apiController.deleteFriend);
router.put('/friends/:id', apiController.updateFriend);

// --- Activity & Stats Routes ---
router.get('/activity', apiController.getActivity);
router.get('/stats', apiController.getStats);

// --- Tracker Actions (Supports both GET & POST for cronjobs and keep-alive pingers) ---
router.get('/check-now', apiController.checkNow);
router.post('/check-now', apiController.checkNow);

// --- AI Problem Assistant Chatbot ---
router.post('/ai/chat', apiController.askAI);

module.exports = router;
