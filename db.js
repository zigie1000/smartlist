// db.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Look up tier from license key (if you support licenseKey usage separately).
 * This only applies if you're storing unique license keys per user.
 */
async function getTierFromLicenseKey(licenseKey) {
  if (!licenseKey) return 'free';

  const { data, error } = await supabase
    .from('licenses')
    .select('license_type')
    .eq('license_key', licenseKey) // 🛑 Only if 'license_key' column exists
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error) {
    console.warn('Supabase licenseKey lookup failed:', error.message);
    return 'free';
  }

  return data?.license_type || 'free';
}

module.exports = { getTierFromLicenseKey, supabase };
