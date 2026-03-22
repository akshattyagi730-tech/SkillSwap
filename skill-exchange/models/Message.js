const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content:  { type: String, required: true, trim: true, maxlength: 1000 },
  read:     { type: Boolean, default: false },
  type:     { type: String, enum: ["text", "call"], default: "text" },
  callStatus: { type: String, enum: ["started", "ended", "missed"], default: null },
  callDuration: { type: Number, default: 0 }, // seconds
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

messageSchema.index({ sender: 1, receiver: 1 });

module.exports = mongoose.model("Message", messageSchema);