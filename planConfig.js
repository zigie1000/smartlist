// planConfig.js
module.exports = function getPlanDetails(planName = '') {
  const lowerName = planName.toLowerCase();

  if (lowerName.includes('monthly')) {
    return { licenseType: 'pro', durationDays: 30 };
  }

  if (lowerName.includes('yearly') || lowerName.includes('annual')) {
    return { licenseType: 'premium', durationDays: 365 };
  }

  if (lowerName.includes('test')) {
    return { licenseType: 'pro', durationDays: 1 / 24 }; // 1 hour
  }

  // Default fallback
  return { licenseType: 'free', durationDays: 0 };
};
