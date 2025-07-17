// tierControl.js

const tiers = ['free', 'pro', 'premium'];

function checkTier(requiredTier) {
  return (req, res, next) => {
    const tier = (req.userTier || 'free').toLowerCase();

    const userIndex = tiers.indexOf(tier);
    const requiredIndex = tiers.indexOf(requiredTier);

    if (userIndex === -1 || requiredIndex === -1) {
      console.warn(`⚠️ Unknown tier: user=${tier}, required=${requiredTier}`);
      return res.status(400).json({ error: 'Unknown tier level' });
    }

    if (userIndex >= requiredIndex) {
      return next();
    }

    const email = req.headers['x-user-email'] || 'unknown';
    console.warn(`⛔ Access denied: ${email} is '${tier}' but needs '${requiredTier}'`);
    return res.status(403).json({
      error: `Insufficient tier: required '${requiredTier}', current '${tier}'`,
      availableTiers: tiers
    });
  };
}

module.exports = {
  checkTier,
  tiers // optional: if needed elsewhere
};
