const express = require("express");
const Stripe = require("stripe");
const { supabase } = require("./licenseManager");

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email || null;
    const metadata = session.metadata || {};
    const licenseKey = metadata.license_key || session.id || null;

    if (!licenseKey) {
      console.error("❌ No license key found in metadata or fallback.");
      return res.status(400).send("Missing license key.");
    }

    try {
      // Check if license already exists
      const { data: existingLicenses, error: existingError } = await supabase
        .from("licenses")
        .select("*")
        .eq("license_key", licenseKey)
        .limit(1);

      if (existingError) throw existingError;

      if (existingLicenses && existingLicenses.length > 0) {
        // Update existing license
        const { error: updateError } = await supabase
          .from("licenses")
          .update({
            is_active: true,
            user_email: customerEmail,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            last_used: new Date().toISOString(),
          })
          .eq("license_key", licenseKey);

        if (updateError) throw updateError;
        console.log(`✅ Updated existing license: ${licenseKey}`);
      } else {
        // Create new license
        const { error: insertError } = await supabase
          .from("licenses")
          .insert([
            {
              license_key: licenseKey,
              is_active: true,
              user_email: customerEmail,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              last_used: new Date().toISOString(),
            },
          ]);

        if (insertError) throw insertError;
        console.log(`✅ Created new license: ${licenseKey}`);
      }

      res.status(200).send("Success");
    } catch (err) {
      console.error("🔥 License processing error:", err.message);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.status(400).end(); // Not a handled event
  }
});

module.exports = router;
