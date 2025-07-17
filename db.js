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
    .select('license_type')
    .eq('license_key', licenseKey)
    .eq('status', 'active')
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .single(); // remove .limit(1)

  if (error) {
    console.warn('License key lookup failed:', error.message);
    return 'free';
  }

  return (data?.license_type || 'free').toLowerCase();
}

async function getTierFromEmail(email) {
  if (!email) return 'free';

  const { data, error } = await supabase
    .from('licenses')
    .select('license_type')
    .eq('email', email)
    .eq('status', 'active')
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    console.warn('Email lookup failed:', error?.message);
    return 'free';
  }

  return (data[0]?.license_type || 'free').toLowerCase();
}

module.exports = {
  supabase,
  getTierFromLicenseKey,
  getTierFromEmail
};
