import mongoose, { Schema } from 'mongoose';
import { ISession } from '../types/index.js';

const sessionSchema = new Schema<ISession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  accessToken: {
    type: String,
    required: true,
  },
  refreshToken: {
    type: String,
    required: true,
  },
  deviceInfo: {
    userAgent: String,
    browser: String,
    os: String,
    device: String,
  },
  ipAddress: {
    type: String,
  },
  location: {
    city: String,
    country: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});


sessionSchema.index({ userId: 1 });
sessionSchema.index({ accessToken: 1 });
sessionSchema.index({ refreshToken: 1 });
sessionSchema.index({ isActive: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = mongoose.model<ISession>('Session', sessionSchema);

export default Session;

