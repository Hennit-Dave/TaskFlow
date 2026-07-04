const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER || 'noreply@taskflow.app';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!SMTP_USER || !SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

async function sendEmail(to, subject, html) {
  const t = getTransporter();
  if (!t) {
    console.log('[EMAIL] SMTP not configured. Would send email to', to, 'subject:', subject);
    return false;
  }
  try {
    await t.sendMail({ from: EMAIL_FROM, to, subject, html });
    console.log('[EMAIL] Sent to', to, 'subject:', subject);
    return true;
  } catch (err) {
    console.error('[EMAIL] Failed to send to', to, err.message);
    return false;
  }
}

function sendLoginEmail(user) {
  const now = new Date().toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  });
  return sendEmail(
    user.email,
    'Sign-in Notification — TaskFlow',
    `<div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #2563eb; margin-bottom: 8px;">New Sign-in</h2>
      <p style="color: #4b4d4e; font-size: 14px; line-height: 1.6;">
        Hi <strong>${user.name}</strong>,<br><br>
        Your TaskFlow account was just signed in to on <strong>${now}</strong>.<br><br>
        If this was you, no action is needed. If you don't recognise this activity, please secure your account immediately.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e5e6; margin: 24px 0;">
      <p style="color: #7d8082; font-size: 12px;">TaskFlow — Organise your tasks, simplify your life.</p>
    </div>`
  );
}

function sendRegisterEmail(user) {
  return sendEmail(
    user.email,
    'Welcome to TaskFlow!',
    `<div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #2563eb; margin-bottom: 8px;">Welcome, ${user.name}! 🎉</h2>
      <p style="color: #4b4d4e; font-size: 14px; line-height: 1.6;">
        Your TaskFlow account has been created successfully.<br><br>
        Start organising your tasks, set priorities, and stay on top of your deadlines.<br><br>
        <a href="${process.env.APP_URL || 'http://localhost:3000'}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">Go to Dashboard</a>
      </p>
      <hr style="border: none; border-top: 1px solid #e5e5e6; margin: 24px 0;">
      <p style="color: #7d8082; font-size: 12px;">TaskFlow — Organise your tasks, simplify your life.</p>
    </div>`
  );
}

function sendLogoutEmail(user) {
  const now = new Date().toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  });
  return sendEmail(
    user.email,
    'Signed Out — TaskFlow',
    `<div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #2563eb; margin-bottom: 8px;">Signed Out</h2>
      <p style="color: #4b4d4e; font-size: 14px; line-height: 1.6;">
        Hi <strong>${user.name}</strong>,<br><br>
        Your TaskFlow account was signed out on <strong>${now}</strong>.<br><br>
        If this was you, no action is needed.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e5e6; margin: 24px 0;">
      <p style="color: #7d8082; font-size: 12px;">TaskFlow — Organise your tasks, simplify your life.</p>
    </div>`
  );
}

function sendTaskReminderEmail(user, tasks) {
  const taskList = tasks.map(t =>
    `<tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e6; font-size: 13px; color: #16181d;">${t.title}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e6; font-size: 13px; color: #16181d;">${t.due_date || '—'}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e6; font-size: 13px; text-transform: capitalize; color: ${t.priority === 'high' ? '#c51707' : t.priority === 'medium' ? '#d97706' : '#16a34a'};">${t.priority}</td>
    </tr>`
  ).join('');

  return sendEmail(
    user.email,
    'Task Reminder — You have pending tasks',
    `<div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #2563eb; margin-bottom: 8px;">Task Reminder ⏰</h2>
      <p style="color: #4b4d4e; font-size: 14px; line-height: 1.6;">
        Hi <strong>${user.name}</strong>,<br><br>
        You have <strong>${tasks.length}</strong> task${tasks.length > 1 ? 's' : ''} that need attention:
      </p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #586074; text-transform: uppercase;">Task</th>
            <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #586074; text-transform: uppercase;">Due</th>
            <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #586074; text-transform: uppercase;">Priority</th>
          </tr>
        </thead>
        <tbody>${taskList}</tbody>
      </table>
      <a href="${process.env.APP_URL || 'http://localhost:3000'}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">View Tasks</a>
      <hr style="border: none; border-top: 1px solid #e5e5e6; margin: 24px 0;">
      <p style="color: #7d8082; font-size: 12px;">TaskFlow — Organise your tasks, simplify your life.</p>
    </div>`
  );
}

module.exports = { sendLoginEmail, sendRegisterEmail, sendLogoutEmail, sendTaskReminderEmail };
