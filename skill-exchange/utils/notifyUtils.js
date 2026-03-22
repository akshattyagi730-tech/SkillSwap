const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// ── Base email template ─────────────────────────────
const baseTemplate = (title, body, ctaText, ctaUrl) => `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f7f8fc;padding:24px;border-radius:16px">
  <div style="text-align:center;margin-bottom:20px">
    <span style="font-size:1.5rem;font-weight:700;color:#1a1a2e">⚡ SkillSwap</span>
  </div>
  <div style="background:#fff;border-radius:14px;padding:28px;border:1.5px solid #f0f0f0">
    <h2 style="color:#1a1a2e;margin:0 0 12px;font-size:1.25rem">${title}</h2>
    <div style="color:#555;font-size:0.92rem;line-height:1.7;margin-bottom:20px">${body}</div>
    ${ctaText && ctaUrl ? `
    <a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#4361ee,#7c3aed);color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:0.9rem">
      ${ctaText}
    </a>` : ""}
  </div>
  <p style="text-align:center;color:#aaa;font-size:0.75rem;margin-top:16px">
    You're receiving this because you have an account on SkillSwap.<br/>
    <a href="${process.env.FRONTEND_URL || "http://localhost:3001"}/profile" style="color:#4361ee">Manage notifications</a>
  </p>
</div>`;

const APP_URL = process.env.FRONTEND_URL || "http://localhost:3001";

// ── Send helper (silent fail — never block main flow) ──
const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    await transporter.sendMail({
      from: `"SkillSwap ⚡" <${process.env.EMAIL_USER}>`,
      to, subject, html,
    });
    console.log(`📧 Notification sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`❌ Email notification failed: ${err.message}`);
  }
};

// ── 1. New Message ──────────────────────────────────
const notifyNewMessage = async ({ toUser, fromUser, preview }) => {
  await sendEmail({
    to: toUser.email,
    subject: `💬 New message from ${fromUser.name} — SkillSwap`,
    html: baseTemplate(
      `${fromUser.name} sent you a message`,
      `<p>Hey <strong>${toUser.name}</strong>,</p>
       <p><strong>${fromUser.name}</strong> just messaged you on SkillSwap:</p>
       <blockquote style="border-left:3px solid #4361ee;margin:12px 0;padding:8px 14px;background:#f4f6ff;border-radius:0 8px 8px 0;color:#333;font-style:italic">
         "${preview.slice(0, 120)}${preview.length > 120 ? "..." : ""}"
       </blockquote>
       <p>Reply now to keep the conversation going!</p>`,
      "View Message",
      `${APP_URL}/chat`
    ),
  });
};

// ── 2. New Match ────────────────────────────────────
const notifyNewMatch = async ({ toUser, matchedUser }) => {
  const teachSkills  = matchedUser.skillsOffered?.slice(0, 3).join(", ") || "various skills";
  const learnSkills  = matchedUser.skillsWanted?.slice(0, 3).join(", ")  || "various skills";
  await sendEmail({
    to: toUser.email,
    subject: `🔥 New skill match found — ${matchedUser.name} — SkillSwap`,
    html: baseTemplate(
      `You matched with ${matchedUser.name}!`,
      `<p>Hey <strong>${toUser.name}</strong>,</p>
       <p>Great news! You have a new skill match on SkillSwap.</p>
       <div style="background:#eef2ff;border-radius:10px;padding:16px;margin:12px 0">
         <p style="margin:0 0 8px;font-weight:600;color:#4361ee">🎯 ${matchedUser.name} can teach you:</p>
         <p style="margin:0 0 12px;color:#333">${teachSkills}</p>
         <p style="margin:0 0 8px;font-weight:600;color:#9333ea">🌱 They want to learn:</p>
         <p style="margin:0;color:#333">${learnSkills}</p>
       </div>
       <p>Start a conversation and swap skills today!</p>`,
      "View Match",
      `${APP_URL}/matches`
    ),
  });
};

// ── 3. New Rating / Review ──────────────────────────
const notifyNewReview = async ({ toUser, fromUser, rating, skill, comment }) => {
  const stars = "⭐".repeat(Math.min(rating, 5));
  await sendEmail({
    to: toUser.email,
    subject: `⭐ ${fromUser.name} rated you ${rating}/5 — SkillSwap`,
    html: baseTemplate(
      `You received a new review!`,
      `<p>Hey <strong>${toUser.name}</strong>,</p>
       <p><strong>${fromUser.name}</strong> left you a review for <strong>${skill}</strong>:</p>
       <div style="background:#fffbeb;border-radius:10px;padding:16px;margin:12px 0;border:1px solid #fde68a">
         <p style="font-size:1.4rem;margin:0 0 6px">${stars}</p>
         <p style="font-weight:600;color:#92400e;margin:0 0 4px">${rating}/5 stars</p>
         ${comment ? `<p style="color:#555;font-style:italic;margin:8px 0 0">"${comment}"</p>` : ""}
       </div>
       <p>Check your profile to see all your reviews!</p>`,
      "View Profile",
      `${APP_URL}/profile`
    ),
  });
};

// ── 4. Session Reminder ─────────────────────────────
const notifySessionReminder = async ({ toUser, otherUser, skill, sessionTime }) => {
  await sendEmail({
    to: toUser.email,
    subject: `⏰ Session reminder — ${skill} with ${otherUser.name} — SkillSwap`,
    html: baseTemplate(
      `Upcoming session: ${skill}`,
      `<p>Hey <strong>${toUser.name}</strong>,</p>
       <p>Just a reminder — you have an upcoming skill session:</p>
       <div style="background:#f0fdf4;border-radius:10px;padding:16px;margin:12px 0;border:1px solid #d1fae5">
         <p style="margin:0 0 6px"><strong>Skill:</strong> ${skill}</p>
         <p style="margin:0 0 6px"><strong>With:</strong> ${otherUser.name}</p>
         ${sessionTime ? `<p style="margin:0"><strong>Time:</strong> ${sessionTime}</p>` : ""}
       </div>
       <p>Don't forget to message each other to confirm!</p>`,
      "Open Chat",
      `${APP_URL}/chat`
    ),
  });
};

module.exports = {
  notifyNewMessage,
  notifyNewMatch,
  notifyNewReview,
  notifySessionReminder,
};