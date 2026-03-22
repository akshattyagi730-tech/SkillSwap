const User = require("../models/User");
const Session = require("../models/Session");

/**
 * @route   POST /credits/session/complete
 * @desc    Mark a session as complete and transfer 1 credit from learner to teacher.
 *          Only the learner can trigger this to confirm the session happened.
 * @access  Protected
 * @body    { teacherId, skill }
 */
const completeSession = async (req, res, next) => {
  try {
    const { teacherId, skill } = req.body;
    const learnerId = req.user._id;

    if (!teacherId || !skill) {
      return res.status(400).json({
        success: false,
        message: "teacherId and skill are required.",
      });
    }

    // Prevent a user from being their own teacher
    if (teacherId === learnerId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot complete a session with yourself.",
      });
    }

    // Verify teacher exists
    const teacher = await User.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    // Verify learner has enough credits
    const learner = await User.findById(learnerId);
    if (learner.credits < 1) {
      return res.status(400).json({
        success: false,
        message: "Insufficient credits. You need at least 1 credit to complete a session.",
      });
    }

    // Atomic credit transfer: deduct from learner, add to teacher
    await User.findByIdAndUpdate(learnerId, { $inc: { credits: -1 } });
    await User.findByIdAndUpdate(teacherId, { $inc: { credits: 1 } });

    // Log the session
    const session = await Session.create({
      teacher: teacherId,
      learner: learnerId,
      skill,
      status: "completed",
      creditTransferred: true,
    });

    res.status(200).json({
      success: true,
      message: `Session completed. 1 credit transferred to ${teacher.name}.`,
      session,
      yourCreditsRemaining: learner.credits - 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /credits/balance
 * @desc    Get the authenticated user's current credit balance
 * @access  Protected
 */
const getBalance = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("name credits");

    res.status(200).json({
      success: true,
      name: user.name,
      credits: user.credits,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /credits/sessions
 * @desc    Get session history for the authenticated user (as teacher or learner)
 * @access  Protected
 */
const getSessionHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const sessions = await Session.find({
      $or: [{ teacher: userId }, { learner: userId }],
    })
      .populate("teacher", "name email")
      .populate("learner", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { completeSession, getBalance, getSessionHistory };
