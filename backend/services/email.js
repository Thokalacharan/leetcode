const nodemailer = require('nodemailer');

// Create SMTP transport if configured
function getTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(port),
    secure: parseInt(port) === 465, // True for port 465, false for other ports
    auth: {
      user,
      pass
    }
  });
}

// Generate styled HTML template for the notification email
function generateEmailHtml(friendName, problemTitle, questionId, difficulty, timestamp, problemSlug) {
  const problemLink = `https://leetcode.com/problems/${problemSlug}/`;
  
  // Format the date/time
  const date = new Date(Number(timestamp) * 1000);
  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  // Map difficulty colors
  let badgeColor = "#22c55e"; // Green for Easy
  if (difficulty.toLowerCase() === 'medium') badgeColor = "#f97316"; // Orange
  if (difficulty.toLowerCase() === 'hard') badgeColor = "#ef4444"; // Red

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CodePulse LeetCode Alert</title>
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #0f172a;
          color: #f8fafc;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #1e293b;
          border-radius: 16px;
          border: 1px solid #334155;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }
        .header {
          background: linear-gradient(135deg, #f97316, #ea580c);
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          color: #ffffff;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
        }
        .card {
          background-color: #0f172a;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 30px;
        }
        .label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #94a3b8;
          margin-bottom: 6px;
        }
        .value {
          font-size: 18px;
          font-weight: 600;
          color: #f8fafc;
          margin-bottom: 20px;
        }
        .value:last-child {
          margin-bottom: 0;
        }
        .difficulty-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #ffffff;
          background-color: ${badgeColor};
          text-transform: uppercase;
          margin-bottom: 20px;
        }
        .motivation {
          text-align: center;
          font-size: 18px;
          font-weight: 700;
          color: #38bdf8;
          margin: 30px 0;
          padding: 15px;
          border-radius: 8px;
          background-color: rgba(56, 189, 248, 0.1);
          border: 1px dashed rgba(56, 189, 248, 0.3);
        }
        .btn-wrapper {
          text-align: center;
        }
        .btn {
          display: inline-block;
          padding: 14px 28px;
          background-color: #f97316;
          color: #ffffff;
          text-decoration: none;
          font-weight: 700;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
          transition: background-color 0.2s;
        }
        .footer {
          text-align: center;
          padding: 20px;
          background-color: #0f172a;
          border-top: 1px solid #334155;
          font-size: 12px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔥 Activity Alert</h1>
        </div>
        <div class="content">
          <div class="card">
            <div class="label">Friend</div>
            <div class="value">${friendName}</div>

            <div class="label">Question Number</div>
            <div class="value" style="font-family: monospace; font-size: 20px; color: #38bdf8;">#${questionId}</div>

            <div class="label">Problem</div>
            <div class="value" style="color: #ea580c; font-size: 20px;">${problemTitle}</div>

            <div class="label">Difficulty</div>
            <div>
              <span class="difficulty-badge">${difficulty}</span>
            </div>

            <div class="label">Submission Time</div>
            <div class="value">${timeString} on ${dateString}</div>
          </div>

          <div class="motivation">
            Your friend is solving. Your turn! 💪
          </div>

          <div class="btn-wrapper">
            <a href="${problemLink}" class="btn" target="_blank">Solve This Problem</a>
          </div>
        </div>
        <div class="footer">
          Sent by CodePulse tracker system. Let's keep coding consistency!
        </div>
      </div>
    </body>
    </html>
  `;
}

// Send Email
async function sendSubmissionNotification(friendName, problemTitle, questionId, difficulty, timestamp, problemSlug) {
  const transporter = getTransporter();
  const to = process.env.EMAIL_TO;
  const from = process.env.EMAIL_FROM || `"CodePulse Alert" <${process.env.EMAIL_USER}>`;

  const subject = `🔥 ${friendName} just solved LeetCode #${questionId}: ${problemTitle}!`;
  const htmlContent = generateEmailHtml(friendName, problemTitle, questionId, difficulty, timestamp, problemSlug);
  const textContent = `🔥 Your friend just solved a LeetCode problem!\n\nFriend: ${friendName}\nProblem: #${questionId} ${problemTitle}\nDifficulty: ${difficulty}\nTime: ${new Date(Number(timestamp) * 1000).toLocaleTimeString()}\n\nYour friend is solving. Your turn! 💪`;

  if (!transporter) {
    console.log(`[Email] [SILENT MODE] SMTP details missing in env. Would send email to: ${to}`);
    console.log(`[Email] Subject: ${subject}`);
    return { success: true, silent: true };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: textContent,
      html: htmlContent
    });
    console.log(`[Email] Notification email sent successfully. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Email] Failed to send notification email:", error);
    throw error;
  }
}

module.exports = {
  sendSubmissionNotification
};
