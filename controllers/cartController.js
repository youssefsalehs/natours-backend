const mongoose = require('mongoose');
const Cart = require('../models/CartModel');
const Tour = require('../models/TourModel');
const catchAsync = require('../utils/catchAsync');
const appError = require('../utils/appError');

const getUserCart = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  let cart = await Cart.findOne({ cartOwner: userId }).setOptions({
    currentUser: req.user,
  });

  if (!cart) return next(new appError('Cart not found', 404));

  res.status(200).json({
    status: 'success',
    cart,
  });
});

const addTourToCart = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { tourId, persons = 1, date } = req.body;

  const tour = await Tour.findById(tourId).setOptions({
    currentUser: req.user,
  });
  if (!tour) return next(new appError('Tour not found', 404));

  let cart = await Cart.findOne({ cartOwner: userId });

  if (!cart) {
    cart = Cart.create({ cartOwner: userId, tours: [] });
  }

  const existingTour = cart.tours.find((t) => t.tour.toString() === tourId);

  if (!existingTour) {
    cart.tours.push({
      tour: tour._id,
      persons,
      date,
      price: tour.price,
      name: tour.name,
      imageCover: tour.imageCover.url,
      totalPrice: tour.price * persons,
    });
  } else {
    return res.status(200).json({
      status: 'success',
      message: 'Tour already exists',
    });
  }

  await cart.save();

  res.status(201).json({
    status: 'success',
    message: 'Tour added to cart',
    cart,
  });
});

const updateTourInCart = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { tourId, operation } = req.params;

  const cart = await Cart.findOne({ cartOwner: userId }).setOptions({
    currentUser: req.user,
  });
  if (!cart) return next(new appError('Cart not found', 404));

  const tourItem = cart.tours.find((t) => t.tour.toString() === tourId);
  if (!tourItem) return next(new appError('Tour not found in cart', 404));

  if (operation === 'inc') {
    tourItem.persons += 1;
  } else if (operation === 'dec') {
    if (tourItem.persons > 1) {
      tourItem.persons -= 1;
    } else {
      cart.tours = cart.tours.filter((t) => t.tour.toString() !== tourId);
    }
  } else {
    return next(new appError("Invalid operation. Use 'inc' or 'dec'", 400));
  }

  cart.tours.forEach((t) => {
    t.totalPrice = t.price * t.persons;
  });

  await cart.save();

  res.status(200).json({
    status: 'success',
    cart,
  });
});

const deleteTourFromCart = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { tourId } = req.params;

  const cart = await Cart.findOne({ cartOwner: userId }).setOptions({
    currentUser: req.user,
  });
  if (!cart) return next(new appError('Cart not found', 404));
  cart.tours = cart.tours.filter((t) => t.tour.toString() !== tourId);
  cart.tours.forEach((t) => {
    t.totalPrice = t.price * t.persons;
  });

  await cart.save();

  res.status(200).json({
    status: 'success',
    message: 'Tour removed from cart',
    cart,
  });
});

const clearUserCart = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const cart = await Cart.findOne({ cartOwner: userId }).setOptions({
    currentUser: req.user,
  });
  if (!cart) return next(new appError('Cart not found', 404));

  cart.tours = [];
  await cart.save();

  res.status(200).json({
    status: 'success',
    message: 'Cart cleared',
    cart,
  });
});

module.exports = {
  getUserCart,
  addTourToCart,
  updateTourInCart,
  deleteTourFromCart,
  clearUserCart,
};
