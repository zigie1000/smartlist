// db.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getTierFromLicenseKey(licenseKey) {
  if (!licenseKey) return 'free';

  const { data, error } = await supabase
    .from('licenses')
    .select('tier')
    .eq('key', licenseKey)
    .single();

  if (error) {
    console.warn('Supabase lookup failed:', error.message);
    return 'free';
  }

  return data?.tier || 'free';
}

module.exports = { getTierFromLicenseKey };
