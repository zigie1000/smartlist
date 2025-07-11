// stripeWebhook.js
const express = require('express');
const router = express.Router();
const { supabase } = require('./licenseManager');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const email = session.customer_email || session.customer_details?.email || '';
    const name = session.customer_details?.name || '';
    const planId = session.client_reference_id || 'manual';
    const planName = session.display_items?.[0]?.custom?.name || session.metadata?.plan_name || 'Unknown';
    const stripeCustomer = session.customer || session.customer_id || 'n/a';

    let licenseType = 'free';
    let durationDays = 0;

    const planNameLower = planName.toLowerCase();
    if (planNameLower.includes('monthly')) {
      licenseType = 'pro';
      durationDays = 30;
    } else if (planNameLower.includes('yearly') || planNameLower.includes('annual')) {
      licenseType = 'premium';
      durationDays = 365;
    } else if (planNameLower.includes('test')) {
      licenseType = 'pro';
      durationDays = 1 / 24; // 1 hour
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + durationDays * 24 * 60); // convert days to minutes

    const { error } = await supabase.from('licenses').insert([{
      email,
      name,
      license_type: licenseType,
      plan_id: planId,
      plan_name: planName,
      stripe_customer: stripeCustomer,
      source: 'stripe',
      status: 'active',
      expires_at: expiresAt.toISOString(),
    }]);

    if (error) {
      console.error('❌ Supabase insert error:', error.message);
      return res.status(500).send('Database insert error');
    }

    console.log(`✅ License created for ${email} [${licenseType}] valid until ${expiresAt.toISOString()}`);
    return res.status(200).send('Success');
  }

  res.status(200).end();
});

module.exports = router;
