const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/auth");
const User    = require("../models/User");
const { notifySessionReminder } = require("../utils/notifyUtils");

/**
 * POST /notify/session-reminder
 * Manually trigger a session reminder email to both participants
 */
router.post("/notify/session-reminder", protect, async (req, res, next) => {
  try {
    const { otherUserId, skill, sessionTime } = req.body;

    if (!otherUserId || !skill) {
      return res.status(400).json({ success: false, message: "otherUserId and skill are required." });
    }

    const otherUser = await User.findById(otherUserId);
    if (!otherUser) return res.status(404).json({ success: false, message: "User not found." });

    // Notify both users
    await Promise.all([
      notifySessionReminder({ toUser: req.user,  otherUser, skill, sessionTime }),
      notifySessionReminder({ toUser: otherUser,  otherUser: req.user, skill, sessionTime }),
    ]);

    res.status(200).json({ success: true, message: "Session reminder sent to both participants." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;