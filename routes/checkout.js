const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SK);
router.post('/create-checkout-session', async (req, res) => {
  const { tours } = req.body;
  const trips = tours.map((t) => ({
    priceData: {
      currency: 'USD',
      tourData: {
        name: t.name,
        imageCover: t.imageCover,
      },
      unit_amount: Math.round(t.price * 100),
    },
    quantity: t.persons,
  }));
  const session = await stripe.checkout.sessions.create({
    payment_method_type: ['card'],
    line_items: trips,
    mode: 'payment',
    success_url: 'https://localhost:5173/overview',
    cancel_url: 'https://localhost:5173/about',
  });

  res.status(200).json({
    id: session.id,
  });
});
module.exports = router;
