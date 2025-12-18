const express = require('express');
const path = require('path');
const globalErrorHandler = require('../controllers/errorController.js');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const app = express();
const cookieParser = require('cookie-parser');

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://natours-backend-six.vercel.app/',
];

const cors = require('cors');
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  })
);
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
//1) set security http header
app.use(helmet());
app.use(morgan('dev'));
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'too many requests from this ip.try again in an hour.',
});
app.use(`/api`, limiter);
app.use(express.json({ limit: '10kb' }));
//data sanitization from nosql query injection
app.use(mongoSanitize());

//data sanitization from xss
app.use(xss());
app.use(express.static(path.join(__dirname, 'public')));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev')); //Every incoming request will be logged to your
//prevent parameter pollution
app.use(hpp());
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.cookies);
  next();
});
const tourRoute = require('../routes/tourRoutes.js');
const userRoute = require('../routes/userRoutes.js');
const reviewRoute = require('../routes/reviewRoutes.js');
const appError = require('../utils/appError.js');
const cartRoute = require('../routes/cartRoutes.js');
app.use('/api/v1/tours', tourRoute);
app.use('/api/v1/users', userRoute);
app.use('/api/v1/reviews', reviewRoute);
app.use('/api/v1/cart', cartRoute);
app.all('*', (req, res, next) => {
  next(new appError(`can't find ${req.originalUrl} on this server`, 404));
});
app.use(globalErrorHandler);
module.exports = app;
