const mongoose = require('mongoose');
const { protect } = require('../controllers/authController');
const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must belong to  a User'],
  },
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Booking must belong to  a tour'],
  },
  price: {
    type: Number,
    required: [true, 'Booking must have price'],
  },
  createdAt: {
    type: Date,
    required: [true, 'Booking must have date'],
  },
  paid: {
    type: Boolean,
    default: true,
  },
});
bookingSchema.pre(/^find/, function (next) {
  this.populate('user').populate({
    path: 'tour',
    select: 'name',
  });
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
