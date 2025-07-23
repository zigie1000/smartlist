const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const { supabase } = require('./db');

router.use(bodyParser.json());

router.post('/webhook', async (req, res) => {
  const event = req.body;

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details.email;
    const licenseKey = session.metadata.licenseKey;
    const plan = session.metadata.plan;

    const { data: existing, error: fetchError } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', licenseKey)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return res.status(500).json({ error: fetchError.message });
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('licenses')
        .update({
          email: email,
          license_type: plan
        })
        .eq('license_key', licenseKey);

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }
    } else {
      const { error: insertError } = await supabase
        .from('licenses')
        .insert([{
          email: email,
          license_key: licenseKey,
          license_type: plan
        }]);

      if (insertError) {
        return res.status(500).json({ error: insertError.message });
      }
    }

    return res.status(200).send('✅ License processed');
  }

  return res.status(400).send('Unhandled event type');
});

module.exports = router;
