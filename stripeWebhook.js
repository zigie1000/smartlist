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

    const email = session.customer_email || (session.customer_details && session.customer_details.email);
    const planId = session.client_reference_id || 'manual';
    const planName = session.display_items ? session.display_items[0]?.custom?.name : 'Unknown';

    let licenseType = 'free';
    let durationDays = 0;

    if (planName.toLowerCase().includes('monthly')) {
      licenseType = 'pro';
      durationDays = 30;
    } else if (planName.toLowerCase().includes('yearly') || planName.toLowerCase().includes('annual')) {
      licenseType = 'premium';
      durationDays = 365;
    } else if (planName.toLowerCase().includes('test')) {
      licenseType = 'pro';
      durationDays = 1 / 24; // 1 hour
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const { error } = await supabase.from('licenses').insert([{
      email,
      license_type: licenseType,
      plan_id: planId,
      plan_name: planName,
      source: 'stripe',
      status: 'active',
      expires_at: expiresAt.toISOString(),
    }]);

    if (error) {
      console.error('Supabase insert error:', error.message);
      return res.status(500).send('Database insert error');
    }

    console.log('License successfully created for', email);
    return res.status(200).send('Success');
  }

  res.status(200).end();
});

module.exports = router;
