const stripe = require('stripe')(process.env.STRIPE_SK);
const Booking = require('../models/BookingsModel');
const Tour = require('../models/TourModel');
const catchAsync = require('../utils/catchAsync');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  const { tourId } = req.params;

  const tour = await Tour.findById(tourId);
  if (!tour) return next(new Error('Tour not found'));

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
    client_reference_id: tourId,
    metadata: {
      bookingId: booking._id.toString(),
    },
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

  console.log('--- Webhook Received ---');
  console.log('Is raw buffer?', Buffer.isBuffer(req.body));
  console.log('req.body length:', req.body.length);
  console.log('Stripe signature header:', sig);

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );

    console.log('Event Verified:', event.type);
    console.log('Checkout session metadata:', event.data.object.metadata);
  } catch (err) {
    console.error('VERIFICATION ERROR:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Only handle checkout session completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      console.log('Booking ID to update:', session.metadata.bookingId);

      const booking = await Booking.findByIdAndUpdate(
        session.metadata.bookingId,
        { paid: true },
        { new: true },
      );

      if (!booking) {
        console.warn(`Booking not found for ID: ${session.metadata.bookingId}`);
      } else {
        console.log(`Booking ${session.metadata.bookingId} marked as paid`);
      }
    } catch (err) {
      console.error(`Error updating booking: ${err.message}`);
      return res.status(500).json({ error: 'Failed to update booking' });
    }
  }

  res.status(200).json({ received: true });
};
