const stripe = require('stripe')(process.env.STRIPE_SK);
const Booking = require('../models/BookingsModel');
const Tour = require('../models/TourModel');
const catchAsync = require('../utils/catchAsync');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  const { tourId } = req.params;

  const tour = await Tour.findById(tourId);
  if (!tour) return next(new Error('Tour not found'));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',

    customer_email: req.user.email,
    client_reference_id: tourId,

    metadata: {
      tourId: tourId,
      userId: req.user._id.toString(),
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

    success_url: `https://natours-app-zeta.vercel.app/`,
    cancel_url: `https://natours-app-zeta.vercel.app/tour/${tourId}`,
  });

  res.status(200).json({
    status: 'success',
    session,
  });
});

const createBookingCheckout = async (session) => {
  await Booking.create({
    tour: session.metadata.tourId,
    user: session.metadata.userId,
    price: session.amount_total / 100,
  });
};

exports.webhookCheckout = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Webhook signature failed:', err.message);
    return res.status(400).send('Webhook error');
  }

  if (event.type === 'checkout.session.completed') {
    const session = await stripe.checkout.sessions.retrieve(
      event.data.object.id
    );

    await createBookingCheckout(session);
  }

  res.status(200).json({ received: true });
};
