import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  action: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' |
  'password_change' | 'password_reset' | 'upload' | 'download' |
  'approve' | 'reject' | 'export';
  resource: string;
  resourceId?: Types.ObjectId;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  userRole: string;
  oldValue?: any;
  newValue?: any;
  category: 'commission' | 'wallet' | 'role' | 'rule' | 'override' | 'general';
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'create', 'read', 'update', 'delete', 'login', 'logout',
      'password_change', 'password_reset', 'upload', 'download',
      'approve', 'reject', 'export'
    ],
  },
  resource: {
    type: String,
    required: true,
  },
  resourceId: {
    type: Schema.Types.ObjectId,
  },
  details: {
    type: Schema.Types.Mixed,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  status: {
    type: String,
    enum: ['success', 'failure'],
    default: 'success',
  },
  errorMessage: {
    type: String,
  },
  userRole: {
    type: String,
    required: true,
  },
  oldValue: {
    type: Schema.Types.Mixed,
  },
  newValue: {
    type: Schema.Types.Mixed,
  },
  category: {
    type: String,
    enum: ['commission', 'wallet', 'role', 'rule', 'override', 'general'],
    default: 'general',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 7776000, // 90 days in seconds
  },
}, {
  timestamps: false,
});

// Indexes
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ resource: 1 });
auditLogSchema.index({ createdAt: 1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });

const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

export default AuditLog;

