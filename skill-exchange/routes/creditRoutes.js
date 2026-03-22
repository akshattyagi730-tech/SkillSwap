const express = require("express");
const router = express.Router();
const {
  completeSession,
  getBalance,
  getSessionHistory,
} = require("../controllers/creditController");
const { protect } = require("../middleware/auth");

// POST /credits/session/complete — Complete a session and transfer 1 credit
router.post("/credits/session/complete", protect, completeSession);

// GET /credits/balance — Get current user's credit balance
router.get("/credits/balance", protect, getBalance);

// GET /credits/sessions — Get session history for current user
router.get("/credits/sessions", protect, getSessionHistory);

module.exports = router;
