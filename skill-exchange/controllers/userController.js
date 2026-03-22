const User  = require("../models/User");
const Block = require("../models/Block");
const { notifyNewMatch } = require("../utils/notifyUtils");

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.status(200).json({ success: true, user });
  } catch (error) { next(error); }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, bio, skillsOffered, skillsWanted } = req.body;

    if (req.body.password || req.body.email) {
      return res.status(400).json({ success: false, message: "Cannot update email/password here." });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (bio  !== undefined) updateData.bio  = bio;
    if (skillsOffered !== undefined) {
      updateData.skillsOffered = Array.isArray(skillsOffered)
        ? skillsOffered.filter(s => s && s.trim())
        : [];
    }
    if (skillsWanted !== undefined) {
      updateData.skillsWanted = Array.isArray(skillsWanted)
        ? skillsWanted.filter(s => s && s.trim())
        : [];
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true }
    ).select("-password");

    console.log(`✅ Profile updated: ${updatedUser.name}`);
    console.log(`   skillsOffered: [${updatedUser.skillsOffered}]`);
    console.log(`   skillsWanted:  [${updatedUser.skillsWanted}]`);

    // Check for new matches and notify them (fire-and-forget)
    if (updateData.skillsOffered || updateData.skillsWanted) {
      (async () => {
        try {
          const newMatches = await User.find({
            _id:           { $ne: updatedUser._id },
            skillsWanted:  { $in: updatedUser.skillsOffered },
            skillsOffered: { $in: updatedUser.skillsWanted },
            isSuspended:   { $ne: true },
          });
          for (const match of newMatches) {
            notifyNewMatch({ toUser: match, matchedUser: updatedUser });
          }
        } catch (_) {}
      })();
    }

    res.status(200).json({ success: true, message: "Profile updated successfully.", user: updatedUser });
  } catch (error) { next(error); }
};

const getMatches = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user._id);

    if (!currentUser.skillsOffered?.length || !currentUser.skillsWanted?.length) {
      return res.status(200).json({ success: true, message: "Add skills to find matches.", matches: [] });
    }

    const blockRecords = await Block.find({
      $or: [{ blocker: currentUser._id }, { blocked: currentUser._id }],
    });
    const blockedIds = blockRecords.map(b =>
      b.blocker.toString() === currentUser._id.toString() ? b.blocked : b.blocker
    );

    const matches = await User.find({
      _id:           { $ne: currentUser._id, $nin: blockedIds },
      skillsWanted:  { $in: currentUser.skillsOffered },
      skillsOffered: { $in: currentUser.skillsWanted },
      isSuspended:   { $ne: true },
    }).select("-password -__v");

    const annotatedMatches = matches.map(match => ({
      user:            match,
      youCanTeach:     match.skillsWanted.filter(s => currentUser.skillsOffered.includes(s)),
      youCanLearnFrom: match.skillsOffered.filter(s => currentUser.skillsWanted.includes(s)),
    }));

    console.log(`🔍 ${currentUser.name}: offered=[${currentUser.skillsOffered}] wanted=[${currentUser.skillsWanted}] → ${annotatedMatches.length} matches`);

    res.status(200).json({ success: true, count: annotatedMatches.length, matches: annotatedMatches });
  } catch (error) { next(error); }
};

module.exports = { getProfile, updateProfile, getMatches };