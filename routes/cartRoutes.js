const express = require('express');
const router = express.Router();
const {
  getUserCart,
  addTourToCart,
  updateTourInCart,
  deleteTourFromCart,
  clearUserCart,
} = require('../controllers/cartController');
const { protect } = require('../controllers/authController');

router.use(protect);

router.get('/', getUserCart);
router.post('/add', addTourToCart);
router.patch('/update/:tourId/:operation', updateTourInCart);
router.delete('/delete/:tourId', deleteTourFromCart);
router.delete('/clear', clearUserCart);

module.exports = router;
