// tierControl.js
const { validateLicenseKey } = require('./licenseManager');

function checkTier(requiredTier) {
  const tiers = ['free', 'pro', 'premium'];

  return async (req, res, next) => {
    const email = req.headers['x-user-email'];

    const tier = await validateLicenseKey(email);
    req.userTier = tier;

    const userIndex = tiers.indexOf(tier || 'free');
    const requiredIndex = tiers.indexOf(requiredTier);

    if (userIndex >= requiredIndex) {
      return next();
    }

    console.warn(`⛔ Access denied: ${email} is '${tier}' but needs '${requiredTier}'`);
    return res.status(403).json({ error: `Insufficient tier: required ${requiredTier}` });
  };
}

module.exports = { checkTier };
