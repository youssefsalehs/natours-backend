const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A User Must Have A Name'],
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      required: [true, 'A User Must Have An Email'],
      trim: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    photo: {
      url: {
        type: String,
        default: 'default.jpg',
      },
      public_id: {
        type: String,
        default: null,
      },
    },
    role: {
      type: String,
      enum: ['user', 'guide', 'lead-guide', 'admin'],
      default: 'user',
    },
    // reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
    password: {
      type: String,
      required: [true, 'Please Provide A Password!'],
      minLength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please Confirm Your Password!'],
      validate: {
        //this only works on save and create so findbyidandupdate isn't an option
        validator: function (el) {
          return el === this.password;
        },
        message: 'Passwords Should Match!',
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetTokenExpires: Date,
    active: { type: Boolean, default: true, select: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
userSchema.virtual('reviews', {
  ref: 'Review', // The model to use
  foreignField: 'user', // Field in Review that references this user
  localField: '_id', // Field in User
});

// Encrypt password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;

  next();
});
// Instance method
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};
userSchema.methods.changePasswordAfter = function (JwtTimeStamp) {
  if (this.passwordChangedAt) {
    const changeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JwtTimeStamp < changeStamp;
  }
  return false;
};
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  console.log({ resetToken }, this.passwordResetToken);
  this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });

  next();
});
const User = mongoose.model('User', userSchema);
module.exports = User;
