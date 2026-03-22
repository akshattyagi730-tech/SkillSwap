const mongoose = require("mongoose");

const blockSchema = new mongoose.Schema({
  blocker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  blocked: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

module.exports = mongoose.model("Block", blockSchema);
