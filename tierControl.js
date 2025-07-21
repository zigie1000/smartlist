function checkTier(requiredTier) {
  const tiers = ['free', 'pro', 'premium'];

  return (req, res, next) => {
    const tier = req.userTier || 'free';

    const userIndex = tiers.indexOf(tier);
    const requiredIndex = tiers.indexOf(requiredTier);

    if (userIndex >= requiredIndex) {
      return next();
    }

    const email = req.headers['x-user-email'] || 'unknown';
    console.warn(`⛔ Access denied: ${email} is '${tier}' but needs '${requiredTier}'`);
    return res.status(403).json({ error: `Insufficient tier: required ${requiredTier}` });
  };
}

module.exports = { checkTier };


function getTierFromLicenseKey(key) {
  if (!key) return "free";
  return key.startsWith("PRO") ? "pro" : "free";
}

function setTier(tier) {
  window.userTier = tier;
  const badge = document.getElementById("tierBadge");
  if (badge) badge.innerText = tier.charAt(0).toUpperCase() + tier.slice(1) + " Tier";
}

module.exports = { checkTier, getTierFromLicenseKey, setTier };
