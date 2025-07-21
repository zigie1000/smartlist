// ✅ BACKEND middleware: checkTier()
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

// ✅ Shared functions (work in both Node.js and browser)
async function getTierFromLicenseKey(key) {
  const res = await fetch(`/api/checkLicense?key=${key}`);
  const data = await res.json();
  return data.tier || "free";
}

function setTier(tier) {
  if (typeof window === 'undefined') return;
  window.userTier = tier;
  const badge = document.getElementById("tierBadge");
  if (badge) {
    badge.innerText = tier.charAt(0).toUpperCase() + tier.slice(1) + " Tier";
  }
}

// ✅ Export logic (works in both environments)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    checkTier,
    getTierFromLicenseKey,
    setTier
  };
} else {
  window.getTierFromLicenseKey = getTierFromLicenseKey;
  window.setTier = setTier;
}
