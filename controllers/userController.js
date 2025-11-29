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
  //1)create error if the user tries to update password here
  if (req.body.password || req.body.passwordConfirm) {
    return next(new appError("this route isn't for updating password", 400));
  }
  //2) update user document
  const filteredBody = filterObj(req.body, 'name', 'email');
  let photo;
  const uploadBuffer = (fileBuffer) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'users' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

      stream.end(fileBuffer);
    });
  };

  if (req.file) {
    const result = await uploadBuffer(req.file.buffer);
    filteredBody.photo = {
      url: result.secure_url,
      public_id: result.public_id,
    };
  }

  const updateUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    status: 'success',
    data: {
      updateUser,
    },
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
