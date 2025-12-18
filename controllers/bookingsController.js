const catchAsync = require('../utils/catchAsync');
const Tour = require('../models/TourModel');
const { query } = require('express');
const Booking = require('../models/BookingsModel');
const stripe = require('stripe')(process.env.STRIPE_SK);
const getCheckoutSession = catchAsync(async (req, res, next) => {
  const { tourId } = req.params;
  const tour = await Tour.findById(tourId).setOptions({
    currentUser: req.user,
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: tour.price * 100,
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [tour.imageCover.url],
          },
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `http://localhost:5173/`,
    cancel_url: `http://localhost:5173/tour/${tourId}`,
    customer_email: req.user.email,
    client_reference_id: tourId,
  });

  res.status(200).json({
    status: 'success',
    session,
  });
});
const createBookingCheckout = async (session) => {
  const tour = session.client_reference_id;
  const userEmail = session.customer_email;
  const price = session.amount_total / 100;

  const user = await User.findOne({ email: userEmail });
  if (!user) return;

  await Booking.create({ tour, user: user._id, price });
};

const webhookCheckout = (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    createBookingCheckout(event.data.object);
  }

  res.status(200).json({ received: true });
};

module.exports = {
  getCheckoutSession,
  webhookCheckout,
};
