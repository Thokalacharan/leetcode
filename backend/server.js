const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const database = require('./services/database');
const tracker = require('./services/tracker');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for local React development server
app.use(cors({
  origin: '*', // In production, we can restrict this to the frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Initialized database and tracker scheduler inside async boot sequence at the bottom


// --- API ROUTES ---

// 1. Get Friends Status List
app.get('/api/friends', async (req, res, next) => {
  try {
    const friends = await database.getFriends();
    res.json(Object.values(friends));
  } catch (error) {
    next(error);
  }
});

// 2. Get Recent Activities
app.get('/api/activity', async (req, res, next) => {
  try {
    const activity = await database.getRecentSubmissions(25);
    res.json(activity);
  } catch (error) {
    next(error);
  }
});

// 3. Get Dashboard Stats
app.get('/api/stats', async (req, res, next) => {
  try {
    const stats = await database.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// 4. Force Scan Now
app.post('/api/check-now', async (req, res, next) => {
  try {
    const result = await tracker.scanNow();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// 5. Trigger Mock Submission for testing
app.post('/api/test/mock-submission', async (req, res, next) => {
  try {
    const { friendId, problemTitle, difficulty } = req.body;
    
    if (!friendId || !problemTitle || !difficulty) {
      return res.status(400).json({ error: "Missing required fields: friendId, problemTitle, difficulty" });
    }

    const result = await tracker.triggerMockSubmission(
      friendId.toLowerCase(),
      problemTitle,
      difficulty
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// --- SERVE LIGHTWEIGHT STATUS PAGE ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>CodePulse Tracker Status</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #0f172a;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }
        .card {
          background-color: #1e293b;
          border: 1px solid #334155;
          padding: 40px;
          border-radius: 16px;
          text-align: center;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          max-width: 400px;
        }
        h1 { margin-top: 0; color: #ea580c; font-size: 28px; }
        p { color: #94a3b8; line-height: 1.6; }
        .badge {
          display: inline-block;
          background-color: #22c55e;
          color: white;
          padding: 6px 16px;
          border-radius: 9999px;
          font-weight: bold;
          font-size: 14px;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>CodePulse</h1>
        <p>Your LeetCode Friend Activity & Motivation Tracker is active and monitoring in the background.</p>
        <span class="badge">🟢 Active and Polling</span>
      </div>
    </body>
    </html>
  `);
});

// Fallback all other routes
app.get('*', (req, res) => {
  res.status(404).json({ error: "Route not found" });
});


// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error("[Server Error]:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message
  });
});

// Boot sequence wrapping database connection
async function startServer() {
  try {
    // Initialize Database
    await database.initialize();

    // Start Tracker Scheduler
    tracker.start();

    // Start listening
    app.listen(PORT, () => {
      console.log(`========================================`);
      console.log(`CodePulse backend running on port ${PORT}`);
      console.log(`API URL: http://localhost:${PORT}/api`);
      console.log(`========================================`);
    });
  } catch (error) {
    console.error("Failed to boot CodePulse server:", error);
    process.exit(1);
  }
}

startServer();
