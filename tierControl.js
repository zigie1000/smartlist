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


async function getTierFromLicenseKey(key) {
  const res = await fetch(`/api/checkLicense?key=${key}`);
  const data = await res.json();
  return data.tier || "free"; // ✅ FIXED (fully replaced logic)
}

function setTier(tier) {
  window.userTier = tier;
  const badge = document.getElementById("tierBadge");
  if (badge) badge.innerText = tier.charAt(0).toUpperCase() + tier.slice(1) + " Tier";
}

module.exports = { checkTier, getTierFromLicenseKey, setTier };
