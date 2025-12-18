const catchAsync = require('../utils/catchAsync');
const Tour = require('../models/TourModel');
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
    success_url: 'http://localhost:5173/',
    cancel_url: `http://localhost:5173/tour/${tourId}`,
    customer_email: req.user.email,
    client_reference_id: tourId,
  });

  res.status(200).json({
    status: 'success',
    session,
  });
});
module.exports = {
  getCheckoutSession,
};
