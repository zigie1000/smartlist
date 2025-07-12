// licenseManager.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function validateLicenseKey(email) {
  if (!email) {
    console.warn("⚠️ No email provided for license validation.");
    return 'free';
  }

  try {
    const { data, error } = await supabase
      .from('licenses')
      .select('license_type, status, expires_at')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error(`❌ Supabase error: ${error.message}`);
      return 'free';
    }

    if (!data || data.length === 0) {
      console.log(`ℹ️ No license found for ${email}`);
      return 'free';
    }

    const license = data[0];
    const now = new Date();

    if (license.status !== 'active') {
      console.log(`🔒 License for ${email} is not active.`);
      return 'free';
    }

    if (license.expires_at && new Date(license.expires_at) < now) {
      console.log(`⏰ License for ${email} has expired.`);
      return 'free';
    }

    console.log(`✅ Valid license for ${email}: ${license.license_type}`);
    return license.license_type || 'free';
  } catch (err) {
    console.error("❌ License validation error:", err);
    return 'free';
  }
}

module.exports = { supabase, validateLicenseKey };
