// tierControl.js
const { supabase } = require('./licenseManager');

// Get the user's tier based on most recent valid license by email
async function getUserTier(email) {
  if (!email) {
    console.warn("⚠️ No email provided for tier lookup.");
    return 'free';
  }

  const { data, error } = await supabase
    .from('licenses')
    .select('license_type, status, expires_at')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('❌ Supabase error fetching license:', error.message);
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

  console.log(`✅ License tier for ${email}: ${license.license_type}`);
  return license.license_type || 'free';
}

module.exports = { getUserTier };
