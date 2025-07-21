// ✅ Optionally import fetch if in Node.js
let fetch;
if (typeof window === 'undefined') {
  fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
}

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

// ✅ SHARED: Get tier from license key (works in both browser and backend)
async function getTierFromLicenseKey(key) {
  const res = await fetch(`https://promptagenthq.onrender.com/api/checkLicense?key=${key}`);
  const data = await res.json();
  return data.tier || "free";
}

// ✅ SHARED: Set tier badge (browser only)
function setTier(tier) {
  if (typeof window === 'undefined') return;
  window.userTier = tier;
  const badge = document.getElementById("tierBadge");
  if (badge) {
    badge.innerText = tier.charAt(0).toUpperCase() + tier.slice(1) + " Tier";
  }
}

// ✅ Universal Export Block
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
