const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  reporter:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reason: { type: String, enum: ["fake_profile","spam","inappropriate_behavior","wrong_skills_listed"], required: true },
  description: { type: String, maxlength: 500, default: "" },
  status: { type: String, enum: ["pending","reviewed","resolved","dismissed"], default: "pending" },
  adminNotes: { type: String, default: "" },
}, { timestamps: true });

reportSchema.index({ reporter: 1, reportedUser: 1, reason: 1 }, { unique: true });

module.exports = mongoose.model("Report", reportSchema);
