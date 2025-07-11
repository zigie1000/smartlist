// stripeWebhook.js
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { supabase } = require('./licenseManager');

async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const subscription = event.data.object;
  const email = subscription.customer_email || subscription.customer_details?.email;
  const status = subscription.status;

  if (email && (event.type === 'checkout.session.completed' || event.type === 'customer.subscription.updated')) {
    const tier = subscription.items.data[0]?.price.nickname?.toLowerCase() || 'pro';

    await supabase
      .from('licenses')
      .insert([{ email, license_type: tier, status }])
      .then(() => console.log(`License updated for ${email} as ${tier}`))
      .catch((err) => console.error('Supabase insert error:', err));
  }

  res.status(200).json({ received: true });
}

module.exports = { handleStripeWebhook };
