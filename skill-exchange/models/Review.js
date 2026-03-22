const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reviewee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating:   { type: Number, required: true, min: 1, max: 5 },
  comment:  { type: String, trim: true, maxlength: 500 },
  skill:    { type: String, required: true },
}, { timestamps: true });

reviewSchema.index({ reviewer: 1, reviewee: 1, skill: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
