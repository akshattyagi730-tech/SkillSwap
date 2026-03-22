const User   = require("../models/User");
const { generateAndSendOTP, verifyOTP } = require("../utils/otpUtils");
const { checkProfileComplete }          = require("../utils/profileUtils");

/**
 * @route   POST /auth/send-otp
 * @desc    Send email verification OTP to the user's registered email
 * @access  Protected
 */
const sendEmailOTP = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Your email is already verified.",
      });
    }

    await generateAndSendOTP(user.email);

    res.status(200).json({
      success: true,
      message: `OTP sent to ${user.email}. Valid for 10 minutes.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /auth/verify-email
 * @desc    Verify email using the OTP received
 * @access  Protected
 * @body    { otp }
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, message: "OTP is required." });
    }

    // Throws if invalid/expired
    await verifyOTP(req.user.email, otp);

    // Update user verified status & re-check profile completeness
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      {
        isEmailVerified: true,
        isProfileComplete: checkProfileComplete({ ...req.user.toObject(), isEmailVerified: true }),
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Email verified successfully! 🎉",
      user: updated,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * @route   POST /auth/send-phone-otp
 * @desc    Send OTP to user's phone number (stub — wire up Twilio in production)
 * @access  Protected
 * @body    { phone }
 */
const sendPhoneOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required." });
    }

    // Save phone to user
    await User.findByIdAndUpdate(req.user._id, { phone });

    // Generate OTP using phone as "email" key in OTP table
    await generateAndSendOTP(phone);

    // ── In production, use Twilio ──────────────────────────
    // await twilioClient.messages.create({
    //   body: `Your SkillSwap OTP: ${otp}`,
    //   from: process.env.TWILIO_PHONE,
    //   to: phone,
    // });

    res.status(200).json({
      success: true,
      message: `OTP sent to ${phone}. Valid for 10 minutes.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /auth/verify-phone
 * @desc    Verify phone number using OTP
 * @access  Protected
 * @body    { otp }
 */
const verifyPhone = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const user = req.user;

    if (!user.phone) {
      return res.status(400).json({ success: false, message: "No phone number on file. Send OTP first." });
    }

    await verifyOTP(user.phone, otp);

    const updated = await User.findByIdAndUpdate(
      user._id,
      { isPhoneVerified: true },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Phone number verified successfully! 📱",
      user: updated,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { sendEmailOTP, verifyEmail, sendPhoneOTP, verifyPhone };
