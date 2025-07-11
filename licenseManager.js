// licenseManager.js
const axios = require('axios');

async function validateLicenseKey(licenseKey) {
  if (!licenseKey) return 'free';

  // Simulate Stripe Test keys
  if (licenseKey.startsWith('test_')) {
    if (licenseKey.includes('monthly')) return 'pro';
    if (licenseKey.includes('annual')) return 'premium';
    return 'free';
  }

  // LemonSqueezy real validation (optional in test/dev)
  try {
    const response = await axios.post(
      'https://api.lemonsqueezy.com/v1/licenses/validate',
      { license_key: licenseKey },
      {
        headers: {
          Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY_TEST}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.valid) {
      const variant = response.data.meta.variant_name.toLowerCase();
      if (variant.includes('monthly')) return 'pro';
      if (variant.includes('yearly') || variant.includes('annual')) return 'premium';
    }

    return 'free';
  } catch (error) {
    console.warn('License check failed:', error.message || error);
    return 'free';
  }
}

module.exports = { validateLicenseKey };
