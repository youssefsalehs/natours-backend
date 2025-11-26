const express = require('express');
const fs = require('fs');
const {
  getAllUsers,
  getUser,
  deleteUser,
  updateUser,
  updateMe,
  deleteMe,
  getMe,
} = require('./../controllers/userController');

const {
  signUp,
  login,
  forgotPassword,
  protect,
  restrictTo,
  resetPassword,
  updatePassword,
} = require('../controllers/authController');

const router = express.Router();

router.post('/signup', signUp);
router.post('/login', login);
router.post('/forgetPassword', forgotPassword);
router.patch('/resetPassword/:token', resetPassword);

router.use(protect);
router.patch('/updatePassword', updatePassword);
router.route('/me').get(getMe, getUser);
router.patch('/updateMe', updateMe);
router.delete('/deleteMe', deleteMe);

router.use(restrictTo('admin'));
router.route('/').get(getAllUsers);
router.route('/:id').get(getUser).delete(deleteUser).patch(updateUser);

module.exports = router;
