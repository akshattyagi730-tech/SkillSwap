const express = require("express");
const router  = express.Router();
const { signup, login, forgotPassword, resetPassword, changePassword } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// POST /signup           — Register new user
router.post("/signup",           signup);

// POST /login            — Login and get JWT
router.post("/login",            login);

// POST /forgot-password  — Send reset OTP to email
router.post("/forgot-password",  forgotPassword);

// POST /reset-password   — Verify OTP + set new password
router.post("/reset-password",   resetPassword);

// POST /change-password  — Change password (logged in)
router.post("/change-password",  protect, changePassword);

module.exports = router;
