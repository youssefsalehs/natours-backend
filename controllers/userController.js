const User = require('../models/UserModel');
const appError = require('../utils/appError');
const { deleteOne, updateOne, getOne, getAll } = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const cloudinary = require('../config/cloudinary');
const filterObj = (obj, ...allowedfields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedfields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};
const getAllUsers = getAll(User);
const getUser = getOne(User);
const getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};
const updateMe = catchAsync(async (req, res, next) => {
  // 1) Prevent password updates here
  if (req.body.password || req.body.passwordConfirm) {
    return next(new appError("This route isn't for updating password!", 400));
  }

  // 2) Filter only allowed fields
  const filteredBody = filterObj(req.body, 'name', 'email');

  // 3) Handle photo upload if exists
  if (req.file) {
    const uploadBuffer = (fileBuffer) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'users' },
          (err, result) => {
            if (err) return reject(err);
            resolve(result);
          }
        );
        stream.end(fileBuffer);
      });

    const result = await uploadBuffer(req.file.buffer);
    filteredBody.photo = {
      url: result.secure_url,
      public_id: result.public_id,
    };
  }

  // 4) Find user and update
  const user = await User.findById(req.user.id);
  if (!user) return next(new appError('User not found', 404));

  Object.assign(user, filteredBody); // Merge changes
  await user.save(); // triggers pre-save hooks

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});
const deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(
    req.user.id,
    { active: false },
    {
      runValidators: true,
      new: true,
    }
  );
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

//don't update password with this
const updateUser = updateOne(User);

const deleteUser = deleteOne(User);

module.exports = {
  getAllUsers,
  getUser,
  getMe,
  deleteUser,
  updateUser,
  updateMe,
  deleteMe,
};
