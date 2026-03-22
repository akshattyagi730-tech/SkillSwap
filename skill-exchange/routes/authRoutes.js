const express = require("express");
const router  = express.Router();
const { signup, login, forgotPassword, resetPassword, changePassword, verifyEmail, sendOTP } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/signup",          signup);
router.post("/login",           login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password",  resetPassword);
router.post("/change-password", protect, changePassword);
router.post("/verify-email",    verifyEmail);
router.post("/send-otp",        sendOTP);

module.exports = router;