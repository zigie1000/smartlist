// tierControl.js
const { validateLicenseKey } = require('./licenseManager');

async function getTierFromRequest(req) {
  const email = req.body.email || req.query.email;
  const tier = await validateLicenseKey(email);
  return tier;
}

module.exports = { getTierFromRequest };
