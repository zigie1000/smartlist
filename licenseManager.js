// licenseManager.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function validateLicenseKey(email) {
  if (!email) return 'free';

  const { data, error } = await supabase
    .from('licenses')
    .select('license_type, status')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0 || data[0].status !== 'active') {
    return 'free';
  }

  return data[0].license_type; // e.g., 'pro', 'premium'
}

module.exports = {
  supabase,
  validateLicenseKey
};
