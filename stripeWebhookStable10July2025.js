const express = require('express');
const router = express.Router();
const { supabase } = require('./licenseManager');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');
const axios = require('axios');

// ✅ Stripe webhook endpoint at /webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Stripe webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email =
      session.customer_email ||
      (session.customer_details && session.customer_details.email);
    const planId = session.client_reference_id || 'manual';
    const stripeCustomer = session.customer;

    let productMetadata = {};
    let stripeProductId = null;

    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ['data.price.product'],
      });

      if (lineItems.data.length > 0) {
        const product = lineItems.data[0].price.product;
        stripeProductId = product.id;
        productMetadata = product.metadata || {};
      }
    } catch (err) {
      console.error('⚠️ Stripe product metadata fetch error:', err.message);
    }

    const licenseType = productMetadata.license_type || 'pro';

    try {
      const { error } = await supabase
        .from('licenses')
        .insert([
          {
            email,
            plan: planId,
            license_type: licenseType,
            stripe_customer: stripeCustomer,
            stripe_product: stripeProductId,
            status: 'active',
            is_active: true,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        ]);

      if (error) throw error;
      console.log(`✅ Stripe license stored for ${email}`);
    } catch (err) {
      console.error('❌ Supabase license insert error:', err.message);
    }
  }

  res.status(200).send('✅ Webhook received.');
});

module.exports = router;
