const stripe = require('stripe')(process.env.STRIPE_SK);
const Booking = require('../models/BookingsModel');
const Tour = require('../models/TourModel');
const catchAsync = require('../utils/catchAsync');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  const { tourId } = req.params;

  const tour = await Tour.findById(tourId);
  if (!tour) return next(new Error('Tour not found'));

  const existingBooking = await Booking.findOne({
    tour: tourId,
    user: req.user._id,
  });

  if (existingBooking?.paid) {
    return next(new Error('You already booked this tour'));
  }

  let booking = existingBooking;

  if (!booking) {
    booking = await Booking.create({
      tour: tourId,
      user: req.user._id,
      price: tour.price,
      paid: false,
    });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: req.user.email,

    // store booking id to update later
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
            images: tour.imageCover?.url ? [tour.imageCover.url] : [],
          },
        },
        quantity: 1,
      },
    ],

    success_url: `${req.protocol}://${req.get('host')}/`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tourId}`,
  });

  res.status(200).json({
    status: 'success',
    session,
  });
});

const createBookingCheckout = async (session) => {
  const existingBooking = await Booking.findOne({
    tour: session.metadata.tourId,
    user: session.metadata.userId,
    price: session.amount_total / 100,
  });

  if (existingBooking) {
    console.log('Booking already exists, skipping creation');
    return existingBooking;
  }

  const booking = await Booking.create({
    tour: session.metadata.tourId,
    user: session.metadata.userId,
    price: session.amount_total / 100,
    paid: true,
    createdAt: new Date(),
  });

  console.log('Booking created:', booking._id);
  return booking;
};

exports.webhookCheckout = async (req, res) => {
  const sig = req.headers['stripe-signature'];

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

    const booking = await Booking.findByIdAndUpdate(
      session.metadata.bookingId,
      {
        paid: true,
      },
    );
    console.log(booking);
  }

  res.status(200).json({ received: true });
};
