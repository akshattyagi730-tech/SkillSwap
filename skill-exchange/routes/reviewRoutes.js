const express = require("express");
const router = express.Router();
const { createReview, getUserReviews } = require("../controllers/reviewController");
const { protect } = require("../middleware/auth");

// POST /review — Submit a review for a user
router.post("/review", protect, createReview);

// GET /reviews/:userId — Get all reviews for a specific user
router.get("/reviews/:userId", protect, getUserReviews);

module.exports = router;
