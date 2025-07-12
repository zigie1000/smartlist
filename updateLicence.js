// updateLicense.js
const express = require('express');
const router = express.Router();
const { supabase } = require('./licenseManager');

// POST /stripe/update-license
router.post('/stripe/update-license', async (req, res) => {
  const { email, plan, license_type, stripe_customer, stripe_product } = req.body;

  if (!email) {
    console.warn('⚠️ Email not provided in update-license request.');
    return res.status(400).json({ error: 'Missing email' });
  }

  try {
    const { error } = await supabase
      .from('licenses')
      .update({
        license_type,
        plan,
        stripe_customer,
        stripe_product
      })
      .eq('email', email);

    if (error) {
      console.error('❌ Supabase update error:', error.message);
      return res.status(500).json({ error: 'Database update failed' });
    }

    console.log(`🔁 License updated for ${email}`);
    return res.status(200).json({ message: 'License updated successfully' });

  } catch (err) {
    console.error('❌ Exception in update-license route:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
