const Review = require('../models/ReviewModel');
const catchAsync = require('../utils/catchAsync');

const {
  deleteOne,
  updateOne,
  createOne,
  getOne,
  getAll,
} = require('./handlerFactory');

const getAllReviews = getAll(Review);
const setTourUserIds = (req, res, next) => {
  if (!req.body.tourId) req.body.tour = req.params.tourId;
  if (!req.body.userId) {
    req.body.user = req.user.id;
  }
  next();
};
const getReview = getOne(Review);

const createReview = createOne(Review);

const updateReview = updateOne(Review);

const deleteReview = deleteOne(Review);
const suspendReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    return next(new AppError('Review not found', 404));
  }

  review.active = review.active ? false : true;
  await review.save();

  res.status(200).json({
    status: 'success',
    data: review,
  });
});
module.exports = {
  getReview,
  setTourUserIds,
  getAllReviews,
  createReview,
  deleteReview,
  updateReview,
  suspendReview,
};
