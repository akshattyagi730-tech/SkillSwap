# ⚡ SkillSwap — Setup Guide

## Step 1 — Backend Setup

```bash
cd skill-exchange
npm install
```

Create `.env` file (copy from `.env.example`):
```
PORT=3000
MONGO_URI=mongodb://localhost:27017/skill_exchange
JWT_SECRET=akshat123supersecretkey
JWT_EXPIRES_IN=7d
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_digit_app_password
```

Start backend:
```bash
npm run dev
```

✅ Should show:
```
🚀 Server running on http://localhost:3000
✅ MongoDB Connected: localhost
🔌 Socket.IO ready for real-time chat
```

---

## Step 2 — Frontend Setup

```bash
cd skillswap-frontend
npm install
npm start
```

✅ Opens at http://localhost:3001

---

## Step 3 — Gmail App Password (for OTP emails)

1. Go to myaccount.google.com
2. Security → 2-Step Verification → ON
3. Search "App Passwords"
4. Generate → copy 16-digit password
5. Paste in .env as EMAIL_PASS

---

## Step 4 — Test Matches (Important!)

For 2 users to match, skills must be EXACT (case-sensitive):

User A:
- skillsOffered: ["Python"]
- skillsWanted:  ["Guitar"]

User B:
- skillsOffered: ["Guitar"]
- skillsWanted:  ["Python"]

---

## Features Included

✅ Signup / Login with JWT
✅ Email OTP Verification
✅ Phone OTP Verification
✅ Forgot Password / Reset Password
✅ Change Password
✅ Smart Skill Matching
✅ Real-time Chat (Socket.IO — WhatsApp style)
✅ Typing indicators
✅ Online/Offline status
✅ Unread message badges
✅ Report User (4 reasons)
✅ Block / Unblock User
✅ Star Ratings & Reviews
✅ Credit System
✅ Profile Completeness tracker
