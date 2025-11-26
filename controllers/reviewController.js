const Review = require('../models/ReviewModel');

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
  if (!req.body.userId) req.body.user = req.user.id;
  next();
};
const getReview = getOne(Review);

const createReview = createOne(Review);

const updateReview = updateOne(Review);

const deleteReview = deleteOne(Review);

module.exports = {
  getReview,
  setTourUserIds,
  getAllReviews,
  createReview,
  deleteReview,
  updateReview,
};
