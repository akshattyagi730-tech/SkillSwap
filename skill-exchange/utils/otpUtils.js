const crypto     = require("crypto");
const nodemailer = require("nodemailer");
const OTP        = require("../models/OTP");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const generateAndSendOTP = async (email) => {
  await OTP.deleteMany({ email });
  const otp       = crypto.randomInt(100000, 999999).toString();
  const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

  await OTP.create({
    email,
    otp: hashedOTP,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  const isEmail = email.includes("@");
  if (isEmail) {
    await transporter.sendMail({
      from: `"SkillSwap ⚡" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your SkillSwap Verification Code",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#f7f8fc;border-radius:16px">
          <h1 style="text-align:center;color:#1a1a2e">⚡ SkillSwap</h1>
          <div style="background:#fff;border-radius:12px;padding:2rem;text-align:center;border:1px solid #f0f0f0">
            <p style="color:#555;font-size:1rem">Your verification code is:</p>
            <div style="font-size:2.5rem;font-weight:700;letter-spacing:12px;color:#4361ee;background:#eef2ff;padding:1rem 2rem;border-radius:10px;display:inline-block">${otp}</div>
            <p style="color:#aaa;font-size:0.85rem;margin-top:1.5rem">Expires in <strong>10 minutes</strong>. Do not share this code.</p>
          </div>
        </div>
      `,
    });
    console.log(`📧 OTP email sent to ${email}`);
  } else {
    // Phone — log in dev, use Twilio in production
    console.log(`📱 OTP for ${email}: ${otp}`);
  }
  return true;
};

const verifyOTP = async (email, inputOTP) => {
  const hashedInput = crypto.createHash("sha256").update(inputOTP).digest("hex");
  const record = await OTP.findOne({ email, verified: false });

  if (!record) throw new Error("OTP not found or already used. Please request a new one.");
  if (new Date() > record.expiresAt) {
    await OTP.deleteOne({ _id: record._id });
    throw new Error("OTP has expired. Please request a new one.");
  }
  if (record.otp !== hashedInput) throw new Error("Invalid OTP. Please try again.");

  await OTP.findByIdAndUpdate(record._id, { verified: true });
  return true;
};

module.exports = { generateAndSendOTP, verifyOTP };
