const appError = require('../utils/appError');

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};
const sendErrorProd = (err, res) => {
  //operational error ,trusted error:send it to the client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
  //programming or unkown error
  else {
    console.error('Error💥', err);
    res.status(500).json({
      status: 'error',
      message: 'something went very wrong!',
    });
  }
};
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path} : ${err.value}`;
  return new appError(message, 400);
};
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];

  const message = `Duplicate value ${value}, Please use another value!`;
  return new appError(message, 400);
};
const handleValidationErrorDB = (err) => {
  const error = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data! ${error.join('. ')}`;
  return new appError(message, 400);
};
const handleJWTError = (err) => {
  const message = `Invalid Token Please Login Again.`;
  return new appError(message, 401);
};
const handleTokenExpiredError = (err) => {
  const message = `Token Is Expired Login Again.`;
  return new appError(message, 401);
};
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    if (err.name === 'CastError') err = handleCastErrorDB(err);
    if (err.code === 11000) err = handleDuplicateFieldsDB(err);
    if (err.name === 'ValidationError') err = handleValidationErrorDB(err);
    if (err.name === 'JsonWebTokenError') err = handleJWTError(err);
    if (err.name === 'TokenExpiredError') err = handleTokenExpiredError(err);
    sendErrorProd(err, res);
  }
};
