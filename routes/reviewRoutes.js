const express = require('express');
const router = express.Router({ mergeParams: true }); //to get tourId from tourRouter
const {
  getAllReviews,
  createReview,
  deleteReview,
  updateReview,
  getReview,
  setTourUserIds,
} = require('../controllers/reviewController');
const { protect, restrictTo } = require('../controllers/authController');
router.use(protect);
router
  .route('/')
  .get(getAllReviews)
  .post(restrictTo('user'), setTourUserIds, createReview);
router
  .route('/:id')
  .delete(deleteReview)
  .patch(restrictTo('user', 'admin'), updateReview)
  .get(getReview);
module.exports = router;
