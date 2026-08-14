# CodePulse — LeetCode Friend Activity & Motivation Tracker

CodePulse is a full-stack web application designed for students and developers to maintain coding consistency and motivation by tracking the LeetCode solving activity of their friends. 

When any of your tracked friends solves a LeetCode problem, CodePulse automatically detects the new submission, records it, and immediately sends an HTML email alert to motivate you to start coding.

---

## 🚀 Key Features

* **Real-time Activity Checking:** Periodically polls the public LeetCode profiles of up to 7 friends at configurable intervals (e.g., every 5 minutes).
* **Robust Duplicate Prevention:** Compares new submissions against historical database entries using unique LeetCode submission IDs.
* **Smart First-Time Baseline:** On the first run, the system registers friends' current solutions as a baseline without back-notifying, preventing inbox spam.
* **Premium Dark Mode Dashboard:** A sleek developer-focused dashboard showing:
  * **Tracked Friends:** Active status badges, current global ranking, last solved problem title, and elapsed time.
  * **Recent Activity Feed:** Chronological list of solutions with colored difficulty tags and language labels.
  * **Live Stats Counter:** Interactive metrics on friends tracked, solutions solved today, and notifications sent.
* **Developer Test Panel:** An integrated control panel allowing developers to force manual checks and simulate mock submissions (e.g., "Rakesh solved Two Sum") to instantly test database updates, live feeds, and email alerts.
* **Flexible Database Architecture (Repository Pattern):**
  * **Zero Setup Mode:** Defaults to a local JSON database file (`backend/data/db.json`) for instant out-of-the-box usage.
  * **Production Mode:** Automatically upgrades to MongoDB Atlas if `MONGODB_URI` is provided in `.env`.
* **Polished HTML Email Notifications:** Delivers visually premium emails featuring details about the problem, its difficulty level, submission time, and direct links to solve the problem.
* **Resilient Error Isolation:** Outages or invalid URLs for one friend do not halt the polling cycle of the other friends.

---

## 🛠️ Tech Stack

* **Frontend:** React (Vite-based SPA), Tailwind CSS v3, Lucide React Icons.
* **Backend:** Node.js, Express.js.
* **Database:** Local JSON Document Store / MongoDB Atlas.
* **Notifications:** Nodemailer (SMTP / Gmail).
* **Process Management:** Concurrently, Nodemon.

---

## 📐 System Architecture & Flow

```text
    Friend 1 (Rakesh) ──┐
    Friend 2 (Mani)   ──┼─> [LeetCode GraphQL API] 
    Friend 3 (Sameer) ──┘        ↓ (Recent Accepted Submissions)
                           [Activity Tracker Poll] ──> [Database Cache Check]
                                 │
                                 ├──> [Duplicate detected?] ──> NO ──> [Store in DB]
                                 │                                          │
                                 └──> [First Run?] ──> NO ──> [SMTP Send Email Alert]
                                                                            ↓
                                                                  [User Receives Email]
```

---

## ⚙️ Environment Configuration

To run the application, configure your credentials in a `.env` file at the root.

Create a copy of `.env.example` named `.env` and fill in the details:
```bash
cp .env.example .env
```

### Gmail Setup: Generating an App Password
For security, Google blocks third-party applications from using your standard password. You must generate an **App Password**:
1. Go to your **Google Account** (https://myaccount.google.com/).
2. Navigate to **Security** on the left panel.
3. Enable **2-Step Verification** (required to generate app passwords).
4. Under "How you sign in to Google" or searching search box, look for **App passwords**.
5. Select **Other (Custom name)**, name it `CodePulse`, and click **Generate**.
6. Copy the **16-digit password** shown on the screen and paste it into the `EMAIL_PASSWORD` variable in your `.env` file.

---

## 💻 Local Installation & Running

### 1. Installation
Install dependencies for the workspace, backend, and frontend with a single command:
```bash
npm run setup
```

### 2. Running in Development Mode
To run the hot-reloading frontend dev server (port 5173) and backend API server (port 5000) concurrently:
```bash
npm run dev
```

### 3. Running in Production Mode (Recommended)
To run in production mode (where the React app is built and served directly on the backend port 5000):
```bash
# Build the frontend production bundle
npm run build

# Start the Express server
npm start
```
Now, navigate to **`http://localhost:5000/`** to view your application!

---

## 🧪 Testing the Application

We have implemented a **Developer Test Panel** directly on the dashboard so you can test email alerts and UI updates:

1. Open the dashboard at `http://localhost:5000/`.
2. Locate the **Developer Test Panel** on the right side.
3. Select a **Friend Solver** (e.g., Rakesh).
4. Select a **LeetCode Problem** (or input a custom one).
5. Click **Simulate Submission**.
6. **Result Verification:**
   * An email will instantly be sent to the configured `EMAIL_TO` inbox containing details and links for the problem. (Note: If you left placeholder credentials, the server will log `[Email] [SILENT MODE] SMTP details missing` instead of crashing).
   * The **Solved Today** count increments.
   * The **Live Activity Feed** displays the simulated solution instantly at the top.
   * The friends table updates that friend's status to **Active** and updates their last solved problem.

---

## 🛡️ Terms of Service & Compliance

CodePulse tracks friends' activities using **publicly available LeetCode data** via their official GraphQL profile query router.
* **No Authentication required** for the friends' accounts (no passwords, session tokens, or private details needed).
* **Respectful Polling Rate Limits:** The scheduler runs on a configurable interval (default is 5 minutes) to avoid overloading LeetCode endpoints.
* **Cache System:** Question difficulties are cached locally in `backend/data/difficulty_cache.json` after the first query to minimize external network requests.
