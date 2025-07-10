const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const LICENSES_FILE = path.join(__dirname, 'licenses.json');

// Middleware: Validate License Key
function licenseMiddleware(req, res, next) {
  const licenseKey = req.headers['x-license-key'] || req.query.license;
  if (!licenseKey) return res.status(403).json({ error: 'Missing license key' });

  try {
    const licenses = JSON.parse(fs.readFileSync(LICENSES_FILE, 'utf-8'));
    const license = licenses.find(l => l.email === licenseKey);
    if (!license) return res.status(403).json({ error: 'Invalid license key' });

    const now = new Date();
    if (new Date(license.expires_at) < now) {
      return res.status(403).json({ error: 'License expired' });
    }

    req.userTier = license.tier; // 'pro' or 'premium'
    next();
  } catch (err) {
    return res.status(500).json({ error: 'License check failed' });
  }
}

// Stripe Webhook to Save License on Purchase
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (request, response) => {
  const sig = request.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_email;
    const productId = session.metadata?.product_id;

    const expiresAt = new Date();
    let tier = 'pro';
    if (productId === 'prod_SdrSt7Fxbx0rpg') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      tier = 'premium';
    } else if (productId === 'prod_SdrRYJOQdPx77F') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    const licenses = fs.existsSync(LICENSES_FILE)
      ? JSON.parse(fs.readFileSync(LICENSES_FILE, 'utf-8'))
      : [];

    licenses.push({
      email: customerEmail,
      tier,
      expires_at: expiresAt.toISOString()
    });

    fs.writeFileSync(LICENSES_FILE, JSON.stringify(licenses, null, 2));
    console.log(`Saved license for ${customerEmail}`);
  }

  response.status(200).end();
});

// Serve success page with instructions
app.get('/success', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Payment Success</h1>
        <p>Please copy and paste your email address used during purchase as your license key.</p>
      </body>
    </html>
  `);
});

// License debug endpoint
app.get('/debug/licenses', (req, res) => {
  if (!fs.existsSync(LICENSES_FILE)) return res.json([]);
  const licenses = JSON.parse(fs.readFileSync(LICENSES_FILE, 'utf-8'));
  res.json(licenses);
});

// Example protected endpoint
app.get('/export', licenseMiddleware, (req, res) => {
  res.json({ message: `Access granted to ${req.userTier} user.` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
