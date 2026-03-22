const checkProfileComplete = (user) => {
  return (
    user.name?.trim().length > 0 &&
    user.bio?.trim().length >= 10 &&
    user.skillsOffered?.length >= 1 &&
    user.skillsWanted?.length  >= 1 &&
    user.isEmailVerified === true
  );
};

const requireActiveAccount = (req, res, next) => {
  if (req.user.isSuspended) {
    return res.status(403).json({
      success: false,
      message: `Account suspended: ${req.user.suspendedReason || "Violation of community guidelines."}`,
    });
  }
  next();
};

module.exports = { checkProfileComplete, requireActiveAccount };
