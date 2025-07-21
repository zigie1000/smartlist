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

async function getTierFromLicenseKey(key) {
  const res = await fetch(`/api/checkLicense?key=${key}`);
  const data = await res.json();
  return data.tier || "free"; // ✅ FIXED (fully replaced logic)
}

module.exports = { checkTier, getTierFromLicenseKey, setTier };
