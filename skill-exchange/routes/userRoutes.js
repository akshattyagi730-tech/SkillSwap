const express = require("express");
const router = express.Router();
const { getProfile, updateProfile, getMatches } = require("../controllers/userController");
const { protect } = require("../middleware/auth");

// GET /profile — Get current user's profile
router.get("/profile", protect, getProfile);

// PUT /profile/update — Update current user's profile
router.put("/profile/update", protect, updateProfile);

// GET /matches — Find mutually matching users
router.get("/matches", protect, getMatches);

module.exports = router;
