const mongoose = require('mongoose');
const slugify = require('slugify');
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A Tour Must Have A Name'],
      unique: true,
      trim: true,
      maxLength: [40, 'A tour name must have less than or equal 40 characters'],
      minLength: [10, 'A tour name must have more than or equal 10 characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A Tour Must Have A Duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A Tour Must Have A Group Size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A Tour Must Have A Difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either :easy,medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1'],
      max: [5, 'Rating must be below 5'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A Tour Must Have A Price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          return val < this.price;
        },
        message: 'Discount price must be below price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A Tour Must Have A Description'],
    },
    description: { type: String, trim: true },
    imageCover: {
      type: String,
      required: [true, 'A Tour Must Have Image Cover'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    startLocation: {
      //GEOJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    secretTour: { type: Boolean, default: false },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });
tourSchema.virtual('durationWeeks').get(function () {
  return Math.ceil(this.duration / 7);
});
//virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});
//doc middleware runs before .save() and .create()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});
////query middleware runs before  find //this here points to current query
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});
tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} millieseconds`);
  console.log(docs);
  next();
});
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt -createdAt -updatedAt',
  });
  next();
});
//Aggregation Middleware
tourSchema.pre('aggregate', function (next) {
  const firstStage = this.pipeline()[0];
  // If first stage is $geoNear → do NOT modify the pipeline
  if (firstStage && firstStage.$geoNear) {
    return next();
  }

  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  next();
});
const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;
