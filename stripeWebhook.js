const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const { supabase } = require('./licenseManager');

// Stripe secret key
const stripe = require('stripe')(process.env.STRIPE_SECRET);

// Raw body middleware for Stripe
router.post(
  '/stripe-webhook',
  bodyParser.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('⚠️ Stripe webhook error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      const customer_email = session.customer_email;
      const stripeCustomer = session.customer;
      const stripeProduct = session.metadata.product;
      const licenseKey = session.metadata.license_key;
      const plan = session.metadata.plan || 'manual';

      // ✅ Map stripe product to license_type (used in tier logic)
      let licenseType = 'free';
      if (stripeProduct === 'pro_monthly' || stripeProduct === 'pro_annual') {
        licenseType = 'pro';
      } else if (stripeProduct === 'premium') {
        licenseType = 'premium';
      }

      const { error } = await supabase
        .from('licenses')
        .upsert(
          {
            email: customer_email,
            license_key: licenseKey,
            status: 'active',
            license_type: licenseType, // ✅ main field used by app
            plan: plan,
            stripe_customer: stripeCustomer,
            stripe_product: stripeProduct,
            updated_at: new Date().toISOString(),
          },
          { onConflict: ['license_key'] }
        );

      if (error) {
        console.error('❌ Supabase upsert error:', error.message);
        return res.status(500).send('Internal server error');
      }

      console.log(`✅ License updated for ${customer_email}`);
      res.status(200).send('Webhook handled');
    } else {
      res.status(200).send('Event ignored');
    }
  }
);

module.exports = router;
