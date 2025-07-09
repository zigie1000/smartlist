// licenseManager.js
const axios = require('axios');

async function validateLicenseKey(licenseKey) {
  if (!licenseKey) return "free";

  // Simulate Stripe test keys
  if (licenseKey === "test_monthly_abc") return "pro";
  if (licenseKey === "test_annual_xyz") return "premium";

  // Validate with LemonSqueezy
  try {
    const response = await axios.post(
      'https://api.lemonsqueezy.com/v1/licenses/validate',
      { license_key: licenseKey },
      {
        headers: {
          Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY_TEST}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const isValid = response?.data?.data?.valid;
    const variant = response?.data?.data?.license?.variant_name?.toLowerCase();

    return isValid && variant ? variant : "free";
  } catch (err) {
    console.warn("License validation failed:", err.message || err);
    return "free";
  }
}

module.exports = { validateLicenseKey };
