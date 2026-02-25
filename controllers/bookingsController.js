const stripe = require('stripe')(process.env.STRIPE_SK);
const Booking = require('../models/BookingsModel');
const Tour = require('../models/TourModel');
const appError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  const { tourId } = req.params;
  const tour = await Tour.findById(tourId);

  if (!tour) return next(new appError('Tour not found', 404));
  const booking = await Booking.create({
    tour: tourId,
    user: req.user._id,
    price: tour.price,
    paid: false,
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/`,
    cancel_url: `${process.env.FRONTEND_URL}/tour/${tour._id}`,
    customer_email: req.user.email,
    client_reference_id: booking._id.toString(),
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
  });

  res.status(200).json({ status: 'success', session });
});

exports.webhookCheckout = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).send('Missing Stripe signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Session ID:', session);
    console.log('Client reference ID (booking):', session.client_reference_id);

    try {
      const booking = await Booking.findById(session.client_reference_id);
      if (!booking) {
        console.error('Booking not found for session:', session.id);
        return;
        return res.status(404).send('Booking not found');
      }

      booking.paid = true;
      await booking.save();
      console.log('Booking marked as paid:', booking._id);
    } catch (err) {
      console.error('Error updating booking:', err);
    }
  }

  res.status(200).json({ received: true });
};
