import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types/index.js';

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
  },
  mobile: {
    type: String,
    required: function (this: IUser) {
      return !this.googleId;
    },
    unique: true,
    sparse: true,
    trim: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit mobile number'],
  },
  password: {
    type: String,
    required: function (this: IUser) {
      return !this.googleId;
    },
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  role: {
    type: Schema.Types.ObjectId,
    ref: 'Role',
    required: true,
  },
  profileImage: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  isMobileVerified: {
    type: Boolean,
    default: false,
  },
  lastLogin: {
    type: Date,
  },
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
  },
  passwordResetToken: {
    type: String,
    select: false,
  },
  passwordResetExpire: {
    type: Date,
    select: false,
  },
  otp: {
    type: String,
    select: false,
  },
  otpExpire: {
    type: Date,
    select: false,
  },
  companyName: {
    type: String,
    trim: true,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  agentCode: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
  },
  geaCode: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
  },
  commissionTier: {
    type: Number,
    default: 1,
    min: 1,
    max: 3,
  },
  referralId: {
    type: String,
    unique: true,
    sparse: true,
  },
  kycStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  mustChangePassword: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});


userSchema.index({ role: 1 });
userSchema.index({ isDeleted: 1 });


userSchema.virtual('fullName').get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});


userSchema.virtual('isLocked').get(function (this: IUser) {
  return !!(this.lockUntil && this.lockUntil > new Date());
});


userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS || '10'));
  this.password = await bcrypt.hash(this.password, salt);
  next();
});


userSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};


userSchema.methods.incLoginAttempts = async function (): Promise<void> {

  if (this.lockUntil && this.lockUntil < new Date()) {
    await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
    return;
  }

  const updates: any = { $inc: { loginAttempts: 1 } };
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');


  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    const lockDuration = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30');
    updates.$set = { lockUntil: new Date(Date.now() + lockDuration * 60 * 1000) };
  }

  await this.updateOne(updates);
};


userSchema.methods.resetLoginAttempts = async function (): Promise<void> {
  await this.updateOne({
    $set: { loginAttempts: 0, lastLogin: new Date() },
    $unset: { lockUntil: 1 },
  });
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;

