// webhook.js
const express = require('express');
const router = express.Router();
const { supabase } = require('./licenseManager');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');
const axios = require('axios');

// Stripe webhook endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('✅ Webhook verified');
  } catch (err) {
    console.error('❌ Stripe webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    console.log('📦 Event received: checkout.session.completed');

    const session = event.data.object;
    console.log('🧾 Stripe session:', session);

    const email = session.customer_email || (session.customer_details && session.customer_details.email);
    const planId = session.client_reference_id || 'manual';
    const stripeCustomer = session.customer;

    let productMetadata = {};
    let stripeProductId = null;

    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data?.[0]?.price?.id;
      console.log('💸 Line item price ID:', priceId);

      const price = await stripe.prices.retrieve(priceId);
      const product = await stripe.products.retrieve(price.product);

      stripeProductId = product?.id;
      productMetadata = product?.metadata || {};
      console.log('📦 Product metadata:', productMetadata);

      if (!productMetadata.tier || !productMetadata.durationDays) {
        console.error('❌ Required metadata missing in product:', productMetadata);
        return res.status(500).send('Missing product metadata');
      }

    } catch (err) {
      console.error('❌ Failed to retrieve line items or product metadata:', err.message);
      return res.status(500).send('Stripe product retrieval error');
    }

    const licenseType = productMetadata.tier;
    const durationDays = parseInt(productMetadata.durationDays, 10);
    const planName = productMetadata.description || 'Unnamed Plan';

    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const licenseKey = crypto.randomBytes(16).toString('hex');

    const insertPayload = {
      email,
      license_key: licenseKey,
      license_type: licenseType,
      plan: planId,
      name: planName,
      status: 'active',
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
      stripe_customer: stripeCustomer,
      stripe_product: stripeProductId
    };

    console.log('🗂 Insert payload to Supabase:', insertPayload);

    const { error } = await supabase.from('licenses').insert([insertPayload]);

    if (error) {
      console.error('❌ Supabase insert error:', error.message);
      return res.status(500).send('Database insert error');
    }

    // 🔁 Optional: call your own server for syncing
    try {
      await axios.post(`${process.env.SITE_URL}/stripe/update-license`, {
        email,
        plan: planId,
        license_type: licenseType,
        stripe_customer: stripeCustomer,
        stripe_product: stripeProductId
      });
      console.log('📡 /stripe/update-license called');
    } catch (err) {
      console.warn('⚠️ Failed to call /stripe/update-license backup:', err.message);
    }

    console.log(`✅ License inserted for ${email} → ${licenseType} until ${expiresAt.toISOString()}`);
    return res.status(200).send('Success');
  }

  console.log(`⚠️ Unhandled event type: ${event.type}`);
  return res.status(200).send('Unhandled event type');
});

module.exports = router;
