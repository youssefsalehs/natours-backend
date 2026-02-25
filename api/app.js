const express = require('express');

const app = express();

const bookingController = require('../controllers/bookingsController');

const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const bookingRoute = require('../routes/bookingRoutes');
const tourRoute = require('../routes/tourRoutes');
const userRoute = require('../routes/userRoutes');
const reviewRoute = require('../routes/reviewRoutes');

const globalErrorHandler = require('../controllers/errorController');
const appError = require('../utils/appError');

// ---------------- SECURITY ----------------
app.use(helmet());
app.use(morgan('dev'));
app.use(cookieParser());

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://natours-backend-six.vercel.app',
  'https://natours-app-zeta.vercel.app',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  }),
);

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, try again in an hour.',
});
app.use('/api', limiter);

app.use(express.static(path.join(__dirname, 'public')));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// ---------------- STRIPE WEBHOOK ----------------
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout,
);
app.use(express.json({ limit: '10kb' }));

// ---------------- ROUTES ----------------
app.use('/api/v1/tours', tourRoute);
app.use('/api/v1/users', userRoute);
app.use('/api/v1/reviews', reviewRoute);
app.use('/api/v1/bookings', bookingRoute);

// ---------------- ERROR HANDLING ----------------
app.all('*', (req, res, next) => {
  next(new appError(`Can't find ${req.originalUrl} on this server`, 404));
});
app.use(globalErrorHandler);

module.exports = app;
