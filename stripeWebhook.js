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

    // 🔍 Fetch full product metadata from line items
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ['data.price.product']
    });

    const product = lineItems.data?.[0]?.price?.product;

    if (!product || !product.metadata) {
      console.error('❌ Product metadata missing in webhook');
      return res.status(500).send('Missing metadata');
    }

    const licenseType = product.metadata.tier || 'free';
    const durationDays = parseInt(product.metadata.durationDays || '0', 10);
    const planName = product.metadata.description || product.name || 'Unknown';

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

  res.status(200).end(); // Return 200 for all other events
});

module.exports = router;
