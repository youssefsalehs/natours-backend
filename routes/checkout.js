const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SK);

router.post('/create-checkout-session', async (req, res) => {
  try {
    const { tours } = req.body;

    const trips = tours.map((t) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: t.name,
          images: [t.imageCover],
        },
        unit_amount: Math.round(t.price * 100),
      },
      quantity: t.persons,
    }));

    const session = await stripe.checkout.sessions.create({
      line_items: trips,
      mode: 'payment',
      success_url: 'http://localhost:5173/',
      cancel_url: 'http://localhost:5173/about',
    });

    // ✅ IMPORTANT CHANGE
    res.status(200).json({
      url: session.url,
    });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
