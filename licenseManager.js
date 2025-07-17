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

async function updateLicense(email, tier, durationDays) {
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('licenses')
    .upsert([
      {
        email,
        license_type: tier,
        status: 'active',
        is_active: true,
        expires_at: expiresAt
      }
    ], {
      onConflict: ['email'] // ensures it updates if the email exists
    });

  if (error) {
    console.error('❌ Supabase upsert error:', error.message);
    throw error;
  }

  console.log(`✅ License ${tier} set for ${email}, expires ${expiresAt}`);
}

// ✅ Minimal debug helper — does NOT affect main logic
async function diagnoseLicense(email) {
  if (!email) return { error: 'No email provided' };

  try {
    const { data, error } = await supabase
      .from('licenses')
      .select('license_type, status, expires_at, created_at')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return { error: 'No license found', raw: error?.message };
    }

    const license = data[0];
    const now = new Date();
    const isValid = license.status === 'active' && new Date(license.expires_at) > now;
    const resolvedTier = isValid ? license.license_type : 'free';

    return {
      email,
      license_type: license.license_type,
      status: license.status,
      expires_at: license.expires_at,
      created_at: license.created_at,
      now: now.toISOString(),
      isValid,
      resolvedTier
    };
  } catch (err) {
    console.error('❌ License diagnostic failed:', err.message);
    return { error: 'Internal error', message: err.message };
  }
}

module.exports = {
  supabase,
  validateLicenseKey,
  updateLicense,
  diagnoseLicense // ✅ Exported
};
