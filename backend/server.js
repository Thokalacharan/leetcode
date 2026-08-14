const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });

const database = require('./services/database');
const tracker = require('./services/tracker');
const apiRouter = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for local React development server
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// --- API ROUTES ---
app.use('/api', apiRouter);

// --- ROOT & HEALTH CHECK ---
app.get('/', (req, res) => {
  res.json({
    status: "online",
    message: "CodePulse Backend API Server is running",
    endpoints: {
      friends: "/api/friends",
      activity: "/api/activity",
      stats: "/api/stats",
      scanNow: "/api/check-now"
    }
  });
});

// --- 404 HANDLER ---
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
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
  // Start listening immediately to bind port 5000 and prevent proxy connection errors
  app.listen(PORT, async () => {
    console.log(`========================================`);
    console.log(`CodePulse backend running on port ${PORT}`);
    console.log(`API URL: http://localhost:${PORT}/api`);
    console.log(`========================================`);
    
    try {
      // Initialize Database in the background
      await database.initialize();

      // Start Tracker Scheduler once database is ready
      tracker.start();
    } catch (error) {
      console.error("Failed to initialize database/scheduler:", error);
    }
  });
}

startServer();
