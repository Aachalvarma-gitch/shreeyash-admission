import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISystemSettings extends Document {
  _id: Types.ObjectId;
  category: 'notification';
  key: string;
  value: any;
  dataType: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  isPublic: boolean;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const systemSettingsSchema = new Schema<ISystemSettings>({
  category: {
    type: String,
    required: true,
    enum: ['notification',],
  },
  key: {
    type: String,
    required: true,
    trim: true,
  },
  value: {
    type: Schema.Types.Mixed,
    required: true,
  },
  dataType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: true,
  },
  description: {
    type: String,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});


systemSettingsSchema.index({ category: 1 });
systemSettingsSchema.index({ key: 1 });
systemSettingsSchema.index({ category: 1, key: 1 }, { unique: true });

const SystemSettings = mongoose.model<ISystemSettings>('SystemSettings', systemSettingsSchema);

export default SystemSettings;

