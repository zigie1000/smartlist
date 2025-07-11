const tiers = ["free", "pro", "premium"];

function checkTier(requiredTier) {
  return function (req, res, next) {
    const userTier = req.userTier || "free";
    if (tiers.indexOf(userTier) >= tiers.indexOf(requiredTier)) {
      return next();
    }
    return res.status(403).json({ error: "Upgrade required" });
  };
}

module.exports = { checkTier };
