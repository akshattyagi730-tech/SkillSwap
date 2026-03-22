const Report = require("../models/Report");
const Block  = require("../models/Block");
const User   = require("../models/User");

// ═══════════════════════════════════════════════
//  REPORT CONTROLLER
// ═══════════════════════════════════════════════

/**
 * @route   POST /report
 * @desc    Report a user for a specific reason
 * @access  Protected
 * @body    { reportedUserId, reason, description }
 */
const reportUser = async (req, res, next) => {
  try {
    const { reportedUserId, reason, description } = req.body;
    const reporterId = req.user._id;

    if (!reportedUserId || !reason) {
      return res.status(400).json({
        success: false,
        message: "reportedUserId and reason are required.",
      });
    }

    // Cannot report yourself
    if (reportedUserId === reporterId.toString()) {
      return res.status(400).json({ success: false, message: "You cannot report yourself." });
    }

    // Check reported user exists
    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const report = await Report.create({
      reporter: reporterId,
      reportedUser: reportedUserId,
      reason,
      description: description || "",
    });

    // Auto-suspend if user gets 5+ reports
    const reportCount = await Report.countDocuments({
      reportedUser: reportedUserId,
      status: "pending",
    });

    if (reportCount >= 5) {
      await User.findByIdAndUpdate(reportedUserId, {
        isSuspended: true,
        suspendedReason: "Auto-suspended: multiple community reports received.",
      });
      console.log(`⚠️  User ${reportedUserId} auto-suspended after ${reportCount} reports.`);
    }

    await report.populate("reporter", "name email");
    await report.populate("reportedUser", "name email");

    res.status(201).json({
      success: true,
      message: "Report submitted successfully. Our team will review it shortly.",
      report,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already reported this user for this reason.",
      });
    }
    next(err);
  }
};

/**
 * @route   GET /reports/my
 * @desc    Get all reports submitted by the current user
 * @access  Protected
 */
const getMyReports = async (req, res, next) => {
  try {
    const reports = await Report.find({ reporter: req.user._id })
      .populate("reportedUser", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reports.length, reports });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════
//  BLOCK CONTROLLER
// ═══════════════════════════════════════════════

/**
 * @route   POST /block
 * @desc    Block a user
 * @access  Protected
 * @body    { blockedUserId }
 */
const blockUser = async (req, res, next) => {
  try {
    const { blockedUserId } = req.body;
    const blockerId = req.user._id;

    if (!blockedUserId) {
      return res.status(400).json({ success: false, message: "blockedUserId is required." });
    }

    if (blockedUserId === blockerId.toString()) {
      return res.status(400).json({ success: false, message: "You cannot block yourself." });
    }

    const targetUser = await User.findById(blockedUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    await Block.create({ blocker: blockerId, blocked: blockedUserId });

    res.status(201).json({
      success: true,
      message: `${targetUser.name} has been blocked. They can no longer message you, see your profile, or appear in your matches.`,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "You have already blocked this user." });
    }
    next(err);
  }
};

/**
 * @route   DELETE /block/:userId
 * @desc    Unblock a previously blocked user
 * @access  Protected
 */
const unblockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const result = await Block.findOneAndDelete({
      blocker: req.user._id,
      blocked: userId,
    });

    if (!result) {
      return res.status(404).json({ success: false, message: "Block record not found." });
    }

    res.status(200).json({ success: true, message: "User unblocked successfully." });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /block/list
 * @desc    Get list of all users blocked by the current user
 * @access  Protected
 */
const getBlockedUsers = async (req, res, next) => {
  try {
    const blocks = await Block.find({ blocker: req.user._id })
      .populate("blocked", "name email bio")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: blocks.length,
      blockedUsers: blocks.map((b) => b.blocked),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /block/check/:userId
 * @desc    Check if a specific user is blocked
 * @access  Protected
 */
const checkBlock = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const block = await Block.findOne({
      $or: [
        { blocker: req.user._id, blocked: userId },
        { blocker: userId, blocked: req.user._id },
      ],
    });

    res.status(200).json({
      success: true,
      isBlocked: !!block,
      blockedBy: block ? (block.blocker.toString() === req.user._id.toString() ? "you" : "them") : null,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  reportUser, getMyReports,
  blockUser, unblockUser, getBlockedUsers, checkBlock,
};
