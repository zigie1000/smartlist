const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const LICENSE_STORE = path.join(__dirname, 'licenseStore.json');

// Helper to read/write license store
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

router.post('/', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const store = loadLicenseStore();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id || session.customer_email;
    const licenseDuration = session.metadata && session.metadata.duration;

    if (userId && licenseDuration) {
      const expiration = new Date();
      if (licenseDuration === 'year') expiration.setFullYear(expiration.getFullYear() + 1);
      else expiration.setMonth(expiration.getMonth() + 1);

      store[userId] = { expires: expiration.toISOString() };
      saveLicenseStore(store);
      console.log(`✔️ License issued to ${userId} until ${store[userId].expires}`);
    }
  }

  res.json({ received: true });
});

module.exports = router;
