const APIFeatures = require('../utils/apiFeatures');
const appError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new appError('No document is found with this ID', 404));
    }
    res.status(204).json({
      status: 'Sucess',
      data: null,
    });
  });
const updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const updatedDoc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedDoc) {
      return next(new appError('No document is found with this ID', 404));
    }
    res.status(200).json({
      status: 'Sucess',
      data: { data: updatedDoc },
    });
  });
const createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const newDoc = await Model.create(req.body);
    res.status(201).json({
      status: 'Sucess',
      data: {
        data: newDoc,
      },
    });
  });
const getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    console.log(popOptions);
    if (popOptions) {
      query = Model.findById(req.params.id)
        .setOptions({ currentUser: req.user })
        .populate(popOptions);
    }
    const doc = await query;
    console.log(doc);
    if (!doc) {
      return next(new appError('No document is found with this ID', 404));
    }
    res.status(200).json({
      status: 'Sucess',
      data: { data: doc },
    });
  });
const getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    //to allow for nested get reviews on tour
    let filter = {};
    if (req.params.tourId) {
      filter = { tour: req.params.tourId };
    }
    if (req.params.userId) {
      filter = { user: req.params.userId };
    }
    const features = new APIFeatures(
      Model.find(filter).setOptions({
        currentUser: req.user,
      }),
      req.query
    )
      .filter()
      .sort()
      .limitFields()
      .paginate();
    // const docs = await features.query.explain();
    const docs = await features.query;
    res.status(200).json({
      status: 'Sucess',
      results: docs.length,
      data: { data: docs },
    });
  });

module.exports = { deleteOne, updateOne, createOne, getOne, getAll };
