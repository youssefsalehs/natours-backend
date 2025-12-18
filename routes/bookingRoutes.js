const express = require('express');
const router = express.Router();
const {
  getCheckoutSession,
  webhookCheckout,
} = require('../controllers/bookingsController');
const { protect } = require('../controllers/authController');

router.get('/checkout-session/:tourId', protect, getCheckoutSession);
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  webhookCheckout
);
module.exports = router;
