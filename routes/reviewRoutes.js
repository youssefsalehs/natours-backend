const express = require('express');
const router = express.Router({ mergeParams: true }); //to get tourId from tourRouter
const {
  getAllReviews,
  createReview,
  deleteReview,
  updateReview,
  getReview,
  setTourUserIds,
  suspendReview,
} = require('../controllers/reviewController');
const { protect, restrictTo } = require('../controllers/authController');
router.use(protect);
router
  .route('/')
  .get(restrictTo('admin', 'lead-guide'), getAllReviews)
  .post(restrictTo('user'), setTourUserIds, createReview);
router
  .route('/:id')
  .delete(deleteReview)
  .patch(restrictTo('user', 'admin'), updateReview)
  .get(getReview);
router.patch('/:id/suspend', restrictTo('admin', 'lead-guide'), suspendReview);
module.exports = router;
