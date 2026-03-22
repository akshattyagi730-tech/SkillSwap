const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  learner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  skill:   { type: String, required: true },
  status:  { type: String, enum: ["pending","completed","cancelled"], default: "pending" },
  creditTransferred: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Session", sessionSchema);
