const express = require('express');
const fs = require('fs');
const multer = require('multer');
const {
  getAllUsers,
  getUser,
  deleteUser,
  updateUser,
  updateMe,
  deleteMe,
  toggleSuspendUser,
  getMe,
} = require('./../controllers/userController');
const reviewRouter = require('./reviewRoutes');
const {
  signUp,
  login,
  forgotPassword,
  protect,
  restrictTo,
  resetPassword,
  updatePassword,
} = require('../controllers/authController');
const appError = require('../utils/appError');

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({ storage });

router.post('/signup', signUp);
router.post('/login', login);
router.post('/forgetPassword', forgotPassword);
router.patch('/resetPassword/:token', resetPassword);
router.use('/:userId/reviews', reviewRouter);
router.use(protect);
router.patch('/updatePassword', updatePassword);
router.route('/me').get(getMe, getUser);
router.patch('/updateMe', upload.single('photo'), updateMe);
router.delete('/deleteMe', deleteMe);

router.use(restrictTo('admin'));
router.route('/').get(getAllUsers);
router.route('/:id').get(getUser).delete(deleteUser).patch(updateUser);
router.patch('/:id/toggle-suspend', toggleSuspendUser);

module.exports = router;
