const jwt    = require("jsonwebtoken");
const crypto = require("crypto");
const User   = require("../models/User");
const { generateAndSendOTP, verifyOTP } = require("../utils/otpUtils");

/**
 * Helper: Generate a signed JWT
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

/**
 * @route   POST /signup
 * @desc    Register a new user + send email verification OTP
 * @access  Public
 */
const signup = async (req, res, next) => {
  try {
    const { name, email, password, bio, skillsOffered, skillsWanted } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email is already registered." });
    }

    const user = await User.create({
      name, email, password, bio,
      skillsOffered: skillsOffered || [],
      skillsWanted:  skillsWanted  || [],
    });

    // Send OTP — log error but don't block
    let otpSent = false;
    try {
      await generateAndSendOTP(email);
      otpSent = true;
      console.log(`✅ OTP sent to ${email}`);
    } catch (emailErr) {
      console.error(`❌ OTP email failed for ${email}:`, emailErr.message);
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: otpSent
        ? "Account created! OTP sent to your email."
        : "Account created! (Email delivery failed — contact support)",
      otpSent,
      token,
      user: {
        id: user._id, name: user.name, email: user.email,
        bio: user.bio, skillsOffered: user.skillsOffered,
        skillsWanted: user.skillsWanted, credits: user.credits,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /login
 * @desc    Authenticate user and return JWT
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please provide email and password." });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: `Account suspended: ${user.suspendedReason || "Violation of community guidelines."}`,
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Logged in successfully.",
      token,
      user: {
        id: user._id, name: user.name, email: user.email,
        bio: user.bio, skillsOffered: user.skillsOffered,
        skillsWanted: user.skillsWanted, credits: user.credits,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /forgot-password
 * @desc    Send a password reset OTP to the user's email
 * @access  Public
 * @body    { email }
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const user = await User.findOne({ email });

    // Always return success (don't reveal if email exists — security best practice)
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If this email is registered, a reset OTP has been sent.",
      });
    }

    await generateAndSendOTP(email);

    res.status(200).json({
      success: true,
      message: "Password reset OTP sent to your email. Valid for 10 minutes.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /reset-password
 * @desc    Verify OTP and set a new password
 * @access  Public
 * @body    { email, otp, newPassword }
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "Email, OTP, and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }

    // Verify OTP first
    await verifyOTP(email, otp);

    // Find user and update password (pre-save hook will hash it)
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    user.password = newPassword;
    await user.save(); // triggers bcrypt hash via pre-save hook

    res.status(200).json({
      success: true,
      message: "Password reset successfully! Please login with your new password.",
    });
  } catch (error) {
    // OTP errors come as plain Error objects
    if (error.message?.includes("OTP")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * @route   POST /change-password
 * @desc    Change password when already logged in (requires old password)
 * @access  Protected
 * @body    { oldPassword, newPassword }
 */
const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Old password and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters." });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.comparePassword(oldPassword))) {
      return res.status(401).json({ success: false, message: "Old password is incorrect." });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({ success: false, message: "New password must be different from old password." });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: "Password changed successfully!" });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /verify-email
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP required." });
    console.log(`🔍 Verifying OTP for ${email}`);
    await verifyOTP(email, otp);
    await User.findOneAndUpdate({ email }, { isEmailVerified: true });
    console.log(`✅ Email verified for ${email}`);
    res.status(200).json({ success: true, message: "Email verified successfully!" });
  } catch (error) {
    console.error(`❌ OTP verification failed:`, error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /send-otp
 */
const sendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required." });
    await generateAndSendOTP(email);
    console.log(`📧 OTP resent to ${email}`);
    res.status(200).json({ success: true, message: "OTP sent!" });
  } catch (error) {
    console.error(`❌ Send OTP failed:`, error.message);
    return res.status(500).json({ success: false, message: "Failed to send OTP. Try again." });
  }
};

module.exports = { signup, login, forgotPassword, resetPassword, changePassword, verifyEmail, sendOTP };