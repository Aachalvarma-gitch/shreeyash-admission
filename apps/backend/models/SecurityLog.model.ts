import mongoose, { Document, Schema } from 'mongoose';

export interface ISecurityLog extends Document {
  eventType: string;
  severity: string;
  message: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const securityLogSchema = new Schema<ISecurityLog>(
  {
    eventType: {
      type: String,
      required: true,
      enum: ['login', 'logout', 'failed_login', 'privilege_change', 'access_denied', 'suspicious_activity'],
    },
    severity: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
    },
    message: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      index: true,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    capped: { size: 536870912, max: 50000 },
  }
);

securityLogSchema.index({ createdAt: -1 });
securityLogSchema.index({ eventType: 1, severity: 1 });
securityLogSchema.index({ userId: 1, createdAt: -1 });

export const SecurityLog = mongoose.model<ISecurityLog>('SecurityLog', securityLogSchema);
