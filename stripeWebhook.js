const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const LICENSE_STORE = path.join(__dirname, 'licenseStore.json');

function loadLicenseStore() {
  try {
    return JSON.parse(fs.readFileSync(LICENSE_STORE, 'utf-8'));
  } catch (e) {
    return {};
  }
}

function saveLicenseStore(data) {
  fs.writeFileSync(LICENSE_STORE, JSON.stringify(data, null, 2));
}

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;
    const sessionId = session.id;

    if (!email || !sessionId) {
      console.warn("Missing email or session ID in Stripe session.");
      return res.status(400).send("Missing data");
    }

    try {
      const fullSession = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items']
      });

      const line = fullSession.line_items.data[0];
      const productId = line.price.product;

      const monthlyId = process.env.STRIPE_MONTHLY_PRODUCT;
      const yearlyId = process.env.STRIPE_YEARLY_PRODUCT;

      let duration, tier;

      if (productId === monthlyId) {
        duration = 'month';
        tier = 'pro';
      } else if (productId === yearlyId) {
        duration = 'year';
        tier = 'premium';
      } else {
        console.warn("Unknown product ID:", productId);
        return res.status(400).send("Unknown product");
      }

      const expiration = new Date();
      if (duration === 'year') expiration.setFullYear(expiration.getFullYear() + 1);
      else expiration.setMonth(expiration.getMonth() + 1);

      const store = loadLicenseStore();
      store[email] = {
        expires: expiration.toISOString(),
        tier
      };

      saveLicenseStore(store);
      console.log(`âï¸ License saved for ${email}: tier=${tier}, expires=${store[email].expires}`);
      res.json({ received: true });
    } catch (error) {
      console.error("Failed to retrieve full session or write license:", error);
      res.status(500).send("Internal error");
    }
  } else {
    res.json({ received: true });
  }
});

module.exports = router;
