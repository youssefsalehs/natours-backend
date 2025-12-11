const Tour = require('./../models/TourModel');

const catchAsync = require('../utils/catchAsync');
const cloudinary = require('../config/cloudinary');
const {
  deleteOne,
  updateOne,
  createOne,
  getOne,
  getAll,
} = require('./handlerFactory');
const appError = require('../utils/appError');
const aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields =
    'name,price,ratingsAverage,summary,difficulty,imageCover,startLocation';
  next();
};

const getAllTours = getAll(Tour);
const getTour = getOne(Tour, { path: 'reviews' });
const createTour = catchAsync(async (req, res) => {
  const tourData = { ...req.body };

  if (req.body.startLocation) {
    tourData.startLocation = JSON.parse(req.body.startLocation);
  }
  if (req.body.locations) {
    tourData.locations = JSON.parse(req.body.locations);
  }

  const uploadBuffer = (fileBuffer, folder) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(fileBuffer);
    });
  };

  // Upload imageCover if exists
  if (req.files?.imageCover?.length) {
    const result = await uploadBuffer(
      req.files.imageCover[0].buffer,
      'tours/cover'
    );
    tourData.imageCover = {
      url: result.secure_url,
      public_id: result.public_id,
    };
  }

  // Upload tour images if exists
  if (req.files?.images?.length) {
    tourData.images = [];
    for (const file of req.files.images) {
      const result = await uploadBuffer(file.buffer, 'tours/images');
      tourData.images.push({
        url: result.secure_url,
        public_id: result.public_id,
      });
    }
  }

  // Create tour
  const newTour = await Tour.create(tourData);

  res.status(201).json({
    status: 'success',
    data: newTour,
  });
});

const updateTour = catchAsync(async (req, res) => {
  const tourData = { ...req.body };

  // Parse JSON fields
  if (req.body.startLocation)
    tourData.startLocation = JSON.parse(req.body.startLocation);
  if (req.body.locations) tourData.locations = JSON.parse(req.body.locations);
  if (req.body.guides) tourData.guides = JSON.parse(req.body.guides);

  const uploadBuffer = (fileBuffer, folder) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
      stream.end(fileBuffer);
    });
  };

  if (req.files?.imageCover?.length) {
    const result = await uploadBuffer(
      req.files.imageCover[0].buffer,
      'tours/cover'
    );
    tourData.imageCover = {
      url: result.secure_url,
      public_id: result.public_id,
    };
  }

  if (req.files?.images?.length) {
    tourData.images = [];
    for (const file of req.files.images) {
      const result = await uploadBuffer(file.buffer, 'tours/images');
      tourData.images.push({
        url: result.secure_url,
        public_id: result.public_id,
      });
    }
  }

  const updatedTour = await Tour.findByIdAndUpdate(req.params.id, tourData, {
    new: true,
    runValidators: true,
  });

  if (!updatedTour)
    return next(new appError('No document found with this ID', 404));

  res.status(200).json({ status: 'success', data: { data: updatedTour } });
});

const deleteTour = deleteOne(Tour);

const getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        // _id: '$ratingsAverage',
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
    {
      $match: { _id: { $ne: 'EASY' } },
    },
  ]);
  res.status(200).json({
    status: 'Sucess',
    data: { stats },
  });
});
const getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 12,
    },
  ]);
  res.status(200).json({
    status: 'Sucess',
    data: { plan },
  });
});
const getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  if (!lat || !lng) {
    return next(
      new appError(
        'Please provide latitude and longitude in lat,lng format',
        400
      )
    );
  }
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});
const getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',').map(Number);

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
  if (!lat || !lng) {
    return next(
      new appError(
        'Please provide latitude and longitude in lat,lng format',
        400
      )
    );
  }
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',

    data: {
      data: distances,
    },
  });
});
module.exports = {
  getAllTours,
  getTour,
  deleteTour,
  updateTour,
  createTour,
  aliasTopTours,
  getTourStats,
  getMonthlyPlan,
  getDistances,
  getToursWithin,
};
