// tierControl.js
const { validateLicenseKey, supabase } = require('./licenseManager');

async function getUserTier(email) {
  const { data, error } = await supabase
    .from('licenses')
    .select('license_type, status, expires_at')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return 'free';

  const license = data[0];

  if (license.status !== 'active') return 'free';

  const now = new Date();
  if (license.expires_at && new Date(license.expires_at) < now) return 'free';

  return license.license_type || 'free';
}

module.exports = { getUserTier };
