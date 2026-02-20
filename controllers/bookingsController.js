const stripe = require('stripe')(process.env.STRIPE_SK);
const Booking = require('../models/BookingsModel');
const Tour = require('../models/TourModel');
const catchAsync = require('../utils/catchAsync');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  const { tourId } = req.params;
  const tour = await Tour.findById(tourId);

  if (!tour) return next(new Error('Tour not found'));

  // 1) Create booking (Unpaid)
  const booking = await Booking.create({
    tour: tourId,
    user: req.user._id,
    price: tour.price,
    paid: false,
  });

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/`, // Redirect here after success
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: tourId,
    mode: 'payment',
    metadata: {
      bookingId: booking._id.toString(), // CRITICAL: This links Stripe back to your DB
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
  console.log('Is raw buffer?', Buffer.isBuffer(req.body)); // must be true
  console.log('req.body length:', req.body.length);
  console.log('Stripe signature header:', req.headers['stripe-signature']);
  console.log('Checkout session metadata:', event.data.object.metadata);
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).send('Missing Stripe signature');
  }
  let event;
  console.log('--- Webhook Received ---'); // LOG 1

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    console.log('Event Verified:', event.type); // LOG 2
  } catch (err) {
    console.error('VERIFICATION ERROR:', err.message); // LOG 3
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    console.log('Processing checkout session...'); // LOG 4
    const session = event.data.object;

    try {
      console.log('Booking ID to update:', session.metadata.bookingId);
      const booking = await Booking.findByIdAndUpdate(
        session.metadata.bookingId,
        { paid: true },
        { new: true },
      );
      console.log('Updated booking:', booking);
      if (!booking) {
        console.warn(`Booking not found for ID: ${session.metadata.bookingId}`);
        return res.status(200).json({ received: true });
      }

      console.log(`Booking ${session.metadata.bookingId} marked as paid`);
    } catch (err) {
      console.error(`Error updating booking: ${err.message}`);
      return res.status(500).json({ error: 'Failed to update booking' });
    }
  }

  res.status(200).json({ received: true });
};
