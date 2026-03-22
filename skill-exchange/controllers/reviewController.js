const Review = require("../models/Review");
const User   = require("../models/User");
const { notifyNewReview } = require("../utils/notifyUtils");

/**
 * @route   POST /review
 * @desc    Leave a review for another user after a skill session
 * @access  Protected
 * @body    { revieweeId, rating, comment, skill }
 */
const createReview = async (req, res, next) => {
  try {
    const { revieweeId, rating, comment, skill } = req.body;

    if (!revieweeId || !rating || !skill) {
      return res.status(400).json({
        success: false,
        message: "revieweeId, rating, and skill are required.",
      });
    }

    // Prevent self-review
    if (revieweeId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot review yourself.",
      });
    }

    // Verify the person being reviewed exists
    const reviewee = await User.findById(revieweeId);
    if (!reviewee) {
      return res.status(404).json({
        success: false,
        message: "User to review not found.",
      });
    }

    // Create review (unique index on reviewer+reviewee+skill prevents duplicates)
    const review = await Review.create({
      reviewer: req.user._id,
      reviewee: revieweeId,
      rating,
      comment,
      skill,
    });

    await review.populate("reviewer", "name email");
    await review.populate("reviewee", "name email");

    // Email notification (fire-and-forget)
    notifyNewReview({
      toUser:   reviewee,
      fromUser: req.user,
      rating,
      skill,
      comment,
    });

    res.status(201).json({
      success: true,
      message: "Review submitted successfully.",
      review,
    });
  } catch (error) {
    // Duplicate review error (unique index violation)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this user for this skill.",
      });
    }
    next(error);
  }
};

/**
 * @route   GET /reviews/:userId
 * @desc    Get all reviews for a specific user, with average rating
 * @access  Protected
 */
const getUserReviews = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const reviews = await Review.find({ reviewee: userId })
      .populate("reviewer", "name email")
      .sort({ createdAt: -1 });

    // Calculate average rating
    const avgRating =
      reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    res.status(200).json({
      success: true,
      count: reviews.length,
      averageRating: avgRating ? parseFloat(avgRating) : null,
      reviews,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createReview, getUserReviews };