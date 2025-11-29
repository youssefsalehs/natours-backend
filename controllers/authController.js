const { promisify } = require('util');
const crypto = require('crypto');
const User = require('../models/UserModel');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const appError = require('../utils/appError');
const sendEmail = require('../utils/emails');
const Email = require('../utils/emails');
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};
const cookieOptions = {
  expires: new Date(
    Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
  ),
  // secure:true,
  httpOnly: true,
};
if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};
const signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role,
  });
  const url = `${req.protocol}://${req.get('host')}/profile`;
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new appError('please provide email and password', 400));
  }
  const user = await User.findOne({ email }).select('+password');
  const correct = await user.correctPassword(password, user.password);

  if (!user || !correct) {
    return next(new appError('Invalid Email Or Password', 401));
  }
  createSendToken(user, 200, res);
});

const protect = catchAsync(async (req, res, next) => {
  //getting token
  let token = '';
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  console.log(token);
  if (!token) {
    return next(new appError('You are not logged in! Please log in.', 401));
  }

  //verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  console.log(decoded);
  // verify if user exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new appError('the user belonging to this token no longer exists.', 401)
    );
  }
  //check if user changes password after token was issued

  if (currentUser.changePasswordAfter(decoded.iat)) {
    return next(
      new appError('User Recently changed password.login again !', 401)
    );
  }

  req.user = currentUser;
  next();
});

const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new appError("you don't have permission to perform this action", 403)
      );
    }
    next();
  };
const forgotPassword = catchAsync(async (req, res, next) => {
  //1)get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new appError("theres's no user with that email address", 404));
  }
  //2) generate random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  //3)send it back as email to user email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/resetPassword/${resetToken}`;
  try {
    await new Email(user, resetURL, resetToken).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'token is sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new appError('there was an error sending email. try again later !', 500)
    );
  }
});
const resetPassword = catchAsync(async (req, res, next) => {
  //1) get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetTokenExpires: { $gt: Date.now() },
  });
  //2) if token isn't expired and htere's user set the new password
  if (!user) {
    return next(new appError('Token  is invaild or has been expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpires = undefined;
  await user.save();
  //3) updatechangePasswordAt property for user
  //4) log in the user and send jwt
  createSendToken(user, 200, res);
});
const updatePassword = catchAsync(async (req, res, next) => {
  //1)get user from collection
  const user = await User.findById(req.user.id).select('+password');
  //2)check if POSTed password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new appError('your current password is wrong', 401));
  }
  //3) if so update password
  user.password = req.body.passwordNew;
  user.passwordConfirm = req.body.passwordNewConfirm;
  await user.save();
  // User.findByIdAndUpdate(); it will not work

  //4) log in and send jwt
  createSendToken(user, 200, res);
});
module.exports = {
  signUp,
  login,
  protect,
  restrictTo,
  forgotPassword,
  resetPassword,
  updatePassword,
};
