const express = require('express');
const router = express.Router();
const { getCheckoutSession } = require('../controllers/bookingsController');
const { protect } = require('../controllers/authController');

router.use(protect);
router.get('/checkout-session/:tourId', getCheckoutSession);

module.exports = router;
