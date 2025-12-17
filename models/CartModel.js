const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
  {
    cartOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    tours: [
      {
        tour: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Tour',
          required: true,
        },
        persons: {
          type: Number,
          default: 1,
          min: 1,
        },
        date: {
          type: Date,
        },
        price: {
          type: Number,
          required: true,
        },
        imageCover: String,
        totalPrice: {
          type: Number,
        },
      },
    ],
  },
  { timestamps: true }
);

// Pre-save hook to calculate totalPrice for each tour
cartSchema.pre('save', function (next) {
  this.tours.forEach((t) => {
    t.totalPrice = t.price * t.persons; // use 'price' from schema
  });
  next();
});

cartSchema.index({ cartOwner: 1 }, { unique: true });

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
