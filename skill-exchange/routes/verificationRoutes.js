const express = require("express");
const router  = express.Router();
const {
  sendEmailOTP, verifyEmail,
  sendPhoneOTP, verifyPhone,
} = require("../controllers/verificationController");
const { protect } = require("../middleware/auth");

// POST /auth/send-otp      — Send email OTP
router.post("/auth/send-otp",      protect, sendEmailOTP);

// POST /auth/verify-email  — Verify email OTP
router.post("/auth/verify-email",  protect, verifyEmail);

// POST /auth/send-phone-otp — Send phone OTP
router.post("/auth/send-phone-otp", protect, sendPhoneOTP);

// POST /auth/verify-phone  — Verify phone OTP
router.post("/auth/verify-phone",  protect, verifyPhone);

module.exports = router;
