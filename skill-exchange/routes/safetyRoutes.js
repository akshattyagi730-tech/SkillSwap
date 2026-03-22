const express = require("express");
const router  = express.Router();
const {
  reportUser, getMyReports,
  blockUser, unblockUser, getBlockedUsers, checkBlock,
} = require("../controllers/safetyController");
const { protect } = require("../middleware/auth");

// ── Report Routes ──────────────────────────────────────
// POST /report          — Report a user
router.post("/report",     protect, reportUser);

// GET  /reports/my      — Get reports I've submitted
router.get("/reports/my",  protect, getMyReports);

// ── Block Routes ───────────────────────────────────────
// POST   /block         — Block a user
router.post("/block",              protect, blockUser);

// DELETE /block/:userId — Unblock a user
router.delete("/block/:userId",    protect, unblockUser);

// GET    /block/list    — Get my blocked users list
router.get("/block/list",          protect, getBlockedUsers);

// GET    /block/check/:userId — Check if user is blocked
router.get("/block/check/:userId", protect, checkBlock);

module.exports = router;
