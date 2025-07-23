// tierControl.js

let fetch;
if (typeof window === 'undefined') {
  fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
}

// ✅ Middleware to restrict access based on required tier
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

// ✅ Function to retrieve license_type from Supabase-backed license API
async function getTierFromLicenseKey(key) {
  try {
    const res = await fetch(`https://promptagenthq.onrender.com/validate-license`, {
      headers: { 'x-user-email': key }
    });
    const data = await res.json();
    return data.tier || 'free';
  } catch (err) {
    console.warn("⚠️ Failed to retrieve tier:", err.message);
    return 'free';
  }
}

// ✅ Update tier badge on frontend
function setTier(tier) {
  if (typeof window === 'undefined') return;

  window.userTier = tier;
  const badge = document.getElementById("tierBadge");
  if (badge) {
    badge.innerText = tier.charAt(0).toUpperCase() + tier.slice(1) + " Tier";
  }
}

// ✅ Export logic for browser and backend
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
