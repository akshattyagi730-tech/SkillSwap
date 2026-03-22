const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email:     { type: String, required: true, lowercase: true },
  otp:       { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  verified:  { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("OTP", otpSchema);
