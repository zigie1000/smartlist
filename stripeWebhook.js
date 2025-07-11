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
    console.error('❌ Stripe webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const email = session.customer_email || (session.customer_details && session.customer_details.email);
    const planId = session.client_reference_id || 'manual';
    const planName = session.display_items?.[0]?.custom?.name || 'Unknown';

    let licenseType = 'free';
    let durationDays = 0;

    // Handle tier detection from name
    const nameLower = planName.toLowerCase();
    if (nameLower.includes('monthly')) {
      licenseType = 'pro';
      durationDays = 30;
    } else if (nameLower.includes('annual') || nameLower.includes('yearly')) {
      licenseType = 'premium';
      durationDays = 365;
    } else if (nameLower.includes('test')) {
      licenseType = 'pro';
      durationDays = 1 / 24; // 1 hour
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const insertPayload = {
      email,
      license_type: licenseType,
      plan_id: planId,
      plan_name: planName,
      source: 'stripe',
      status: 'active',
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString()
    };

    const { error } = await supabase.from('licenses').insert([insertPayload]);

    if (error) {
      console.error('❌ Supabase insert error:', error.message);
      return res.status(500).send('Database insert error');
    }

    console.log(`✅ License inserted for ${email} as ${licenseType}`);
    return res.status(200).send('Success');
  }

  res.status(200).end(); // Always return 200 for other events
});

module.exports = router;
