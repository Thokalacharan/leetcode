const nodemailer = require('nodemailer');

// Create SMTP transport if configured
function getTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT) || 465;
  const isGmail = host.includes('gmail') || (!process.env.EMAIL_HOST);

  if (isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: user.trim(),
        pass: pass.trim()
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: user.trim(),
      pass: pass.trim()
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000
  });
}

// Send via Resend HTTP API (works 100% on Render Free Tier via HTTPS Port 443)
async function sendViaResend(to, from, subject, text, html) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  // Resend requires using 'onboarding@resend.dev' unless a custom domain is verified
  const resendFrom = process.env.RESEND_FROM || 'LeetPulse Tracker <onboarding@resend.dev>';
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [to],
      subject: subject,
      text: text,
      html: html
    })
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || resData.error || 'Resend HTTP API failed');
  }

  return { success: true, messageId: resData.id };
}

// Send via Brevo HTTP API (works over HTTPS Port 443 to any recipient)
async function sendViaBrevo(to, from, subject, text, html) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;

  const senderEmail = process.env.EMAIL_USER || 'notifications@codepulse.dev';
  const senderName = 'LeetPulse Tracker';

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey.trim(),
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject: subject,
      textContent: text,
      htmlContent: html
    })
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Brevo API failed');
  }

  return { success: true, messageId: resData.messageId };
}

// Generate premium, email-client compatible HTML template
function generateEmailHtml(friendName, problemTitle, questionId, difficulty, timestamp, problemSlug, submissionId, username) {
  const problemLink = `https://leetcode.com/problems/${problemSlug}/`;
  
  // Construct direct link to LeetCode submission page if valid submissionId is present
  const submissionLink = submissionId && !submissionId.startsWith("mock_")
    ? `https://leetcode.com/submissions/detail/${submissionId}/`
    : null;
  
  // Format the date/time
  const date = new Date(Number(timestamp) * 1000);
  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  // Map difficulty styles
  const diff = (difficulty || 'Easy').toLowerCase();
  let badgeColor = "#10b981"; // Green for Easy
  let badgeBg = "#064e3b";
  let badgeBorder = "#059669";

  if (diff === 'medium') {
    badgeColor = "#f59e0b"; // Amber
    badgeBg = "#78350f";
    badgeBorder = "#d97706";
  } else if (diff === 'hard') {
    badgeColor = "#ef4444"; // Red
    badgeBg = "#7f1d1d";
    badgeBorder = "#dc2626";
  }

  const userHandleText = username ? `@${username}` : `@${friendName.toLowerCase().replace(/\s+/g, '')}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodePulse LeetCode Alert</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #070b13; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #f1f5f9;">

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #070b13; padding: 40px 10px;">
    <tr>
      <td align="center">
        
        <!-- Main Card Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #ea580c 0%, #f97316 50%, #eab308 100%); padding: 32px 30px; text-align: center;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: rgba(0, 0, 0, 0.2); padding: 8px 16px; border-radius: 50px; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.2);">
                      <span style="font-size: 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">⚡ Live LeetCode Solve</span>
                    </div>
                    <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; line-height: 1.2;">
                      ${friendName} Just Crushed a Problem!
                    </h1>
                    <p style="margin: 6px 0 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.9); font-weight: 500;">
                      ${userHandleText} logged an accepted solution
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Problem Details Content -->
          <tr>
            <td style="padding: 32px 28px 24px 28px;">
              
              <!-- Problem Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #090e17; border: 1px solid #1e293b; border-radius: 16px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 22px 20px;">
                    
                    <!-- Question Number & Difficulty Tag -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 12px;">
                      <tr>
                        <td align="left">
                          <span style="font-family: monospace; font-size: 13px; font-weight: 800; color: #f59e0b; background-color: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); padding: 3px 8px; border-radius: 6px;">
                            #${questionId || 'N/A'}
                          </span>
                        </td>
                        <td align="right">
                          <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: ${badgeColor}; background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; padding: 3px 10px; border-radius: 6px;">
                            ${difficulty || 'Easy'}
                          </span>
                        </td>
                      </tr>
                    </table>

                    <!-- Problem Title -->
                    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                      ${problemTitle}
                    </h2>

                    <!-- Timestamp & Solver Info -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #1e293b; padding-top: 14px;">
                      <tr>
                        <td align="left" style="font-size: 12px; color: #94a3b8;">
                          👤 Solver: <strong style="color: #f1f5f9;">${friendName}</strong>
                        </td>
                        <td align="right" style="font-size: 12px; color: #94a3b8;">
                          🕒 <strong style="color: #cbd5e1;">${timeString}</strong> · ${dateString}
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Motivation Banner -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(234, 88, 12, 0.08); border: 1px dashed rgba(234, 88, 12, 0.35); border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 16px; text-align: center;">
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #fb923c;">
                      🔥 Your friend is grinding consistency. Time to solve yours!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Buttons -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    
                    <!-- Solve Problem Button -->
                    <a href="${problemLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #ea580c, #f97316); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.4); margin: 6px;">
                      ⚡ Solve This Problem
                    </a>

                    <!-- View Code Button -->
                    ${submissionLink ? `
                    <a href="${submissionLink}" target="_blank" style="display: inline-block; background-color: #1e293b; border: 1px solid #334155; color: #38bdf8; text-decoration: none; font-size: 14px; font-weight: 700; padding: 13px 24px; border-radius: 12px; margin: 6px;">
                      💻 View Their Code
                    </a>
                    ` : ''}

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 24px; background-color: #070b13; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 500;">
                Dispatched automatically by <strong style="color: #94a3b8;">LeetPulse Tracker</strong>.
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #475569;">
                Keeping your competitive programming streak alive 🚀
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
}

// Send Email
async function sendSubmissionNotification(friendName, problemTitle, questionId, difficulty, timestamp, problemSlug, submissionId, username) {
  const transporter = getTransporter();
  const to = process.env.EMAIL_TO;
  const from = process.env.EMAIL_FROM || `"CodePulse Tracker" <${process.env.EMAIL_USER}>`;

  const subject = `🔥 ${friendName} just solved LeetCode #${questionId || ''}: ${problemTitle}!`;
  const htmlContent = generateEmailHtml(friendName, problemTitle, questionId, difficulty, timestamp, problemSlug, submissionId, username);
  
  const subLinkText = submissionId && !submissionId.startsWith("mock_")
    ? `\nView Their Solution: https://leetcode.com/submissions/detail/${submissionId}/`
    : '';

  const textContent = `🔥 ${friendName} just solved a LeetCode problem!\n\nProblem: #${questionId} ${problemTitle}\nDifficulty: ${difficulty}\nTime: ${new Date(Number(timestamp) * 1000).toLocaleTimeString()}\n\nSolve Problem: https://leetcode.com/problems/${problemSlug}/${subLinkText}\n\nYour friend is solving. Your turn! 💪`;

  // 1. Try sending via Resend HTTP API if configured (bypasses all cloud firewall/port blocking)
  if (process.env.RESEND_API_KEY) {
    try {
      console.log(`[Email] Dispatching via Resend HTTP API to ${to}...`);
      const resendResult = await sendViaResend(to, from, subject, textContent, htmlContent);
      if (resendResult && resendResult.success) {
        console.log(`[Email] Notification email delivered successfully via Resend API to ${to}. MessageId: ${resendResult.messageId}`);
        return resendResult;
      }
    } catch (resendError) {
      console.error("[Email] Resend API error:", resendError.message);
    }
  }

  // 2. Try sending via Brevo HTTP API if configured
  if (process.env.BREVO_API_KEY) {
    try {
      console.log(`[Email] Dispatching via Brevo HTTP API to ${to}...`);
      const brevoResult = await sendViaBrevo(to, from, subject, textContent, htmlContent);
      if (brevoResult && brevoResult.success) {
        console.log(`[Email] Notification email delivered successfully via Brevo API to ${to}. MessageId: ${brevoResult.messageId}`);
        return brevoResult;
      }
    } catch (brevoError) {
      console.error("[Email] Brevo API error:", brevoError.message);
    }
  }

  // 3. Fallback to Nodemailer SMTP
  if (!transporter) {
    console.warn(`[Email] [MISSING CONFIG] Neither RESEND_API_KEY, BREVO_API_KEY, nor SMTP credentials (EMAIL_USER / EMAIL_PASSWORD) are configured. Cannot dispatch email to: ${to}`);
    return { success: false, silent: true, error: "Email credentials not configured" };
  }

  try {
    console.log(`[Email] Dispatching via SMTP to ${to}...`);
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: textContent,
      html: htmlContent
    });
    console.log(`[Email] Notification email sent successfully to ${to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Email] Failed to send notification email via SMTP:", error.message);
    throw error;
  }
}

module.exports = {
  sendSubmissionNotification
};
