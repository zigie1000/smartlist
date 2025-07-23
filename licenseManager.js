const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 🔒 GET LICENSE BY KEY
async function getLicenseByKey(key) {
  const { data, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('license_key', key)
    .single();

  if (error) {
    console.error('❌ Error fetching license by key:', error.message);
    return null;
  }
  return data;
}

// 📧 GET LICENSE BY EMAIL
async function getLicenseByEmail(email) {
  const { data, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    console.error('❌ Error fetching license by email:', error.message);
    return null;
  }
  return data;
}

module.exports = {
  supabase,
  getLicenseByKey,
  getLicenseByEmail
};
