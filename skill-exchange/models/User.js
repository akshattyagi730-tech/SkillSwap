const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  bio:      { type: String, default: "", maxlength: 500 },
  skillsOffered: { type: [String], default: [] },
  skillsWanted:  { type: [String], default: [] },
  credits:       { type: Number, default: 0 },
  verifiedSkills:{ type: Map, of: Object, default: {} },
  isEmailVerified:  { type: Boolean, default: false },
  isPhoneVerified:  { type: Boolean, default: false },
  isProfileComplete:{ type: Boolean, default: false },
  isSuspended:      { type: Boolean, default: false },
  suspendedReason:  { type: String, default: "" },
  phone:     { type: String, default: "" },
  googleId:  { type: String, default: "" },
  githubId:  { type: String, default: "" },
  authProvider: { type: String, enum: ["local","google","github"], default: "local" },
}, { timestamps: true });

userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidate) {
  return await bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);