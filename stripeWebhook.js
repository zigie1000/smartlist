const express = require('express');
const router = express.Router();
const { supabase } = require('./licenseManager');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Stripe webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`📩 Stripe event received: ${event.type}`);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const email = session.customer_email || (session.customer_details && session.customer_details.email);
    const planId = session.client_reference_id || 'manual';

    // Expand line items including product metadata
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ['data.price.product']
    });

    const product = lineItems.data?.[0]?.price?.product;

    if (!product || !product.metadata) {
      console.error('❌ Product metadata missing or not expanded');
      return res.status(500).send('Missing metadata');
    }

    const licenseType = product.metadata.tier || 'free';
    const durationDays = parseInt(product.metadata.durationDays || '0', 10);
    const planName = product.metadata.description || product.name || 'Unknown';

    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 86400 * 1000);
    const licenseKey = crypto.randomBytes(16).toString('hex');

    const insertPayload = {
      email,
      license_key: licenseKey,
      license_type: licenseType,
      plan_id: planId,
      plan_name: planName,
      source: 'stripe',
      status: 'active',
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString()
    };

    console.log(`📝 Inserting license for ${email} as '${licenseType}' valid until ${expiresAt.toISOString()}`);

    const { error } = await supabase.from('licenses').insert([insertPayload]);

    if (error) {
      console.error('❌ Supabase insert error:', error.message);
      return res.status(500).send('Database insert error');
    }

    console.log(`✅ License inserted successfully for ${email}`);
    return res.status(200).send('Webhook processed successfully');
  }

  // Handle other event types if needed
  res.status(200).end();
});

module.exports = router;
