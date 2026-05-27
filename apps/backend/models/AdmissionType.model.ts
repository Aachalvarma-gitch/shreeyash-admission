import mongoose, { Schema, Document } from 'mongoose';

export interface IAdmissionType extends Document {
  name: string;
  slug: string;
  description?: string;
  requiredDocuments: string[];
  optionalDocuments: string[];
  fee: number;
  displayOrder: number;
  isActive: boolean;
}

const admissionTypeSchema = new Schema<IAdmissionType>(
  {
    name: {
      type: String,
      required: [true, 'Admission type name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    requiredDocuments: {
      type: [String],
      default: [],
    },
    optionalDocuments: {
      type: [String],
      default: [],
    },
    fee: {
      type: Number,
      default: 0,
      min: [0, 'Fee cannot be negative'],
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

admissionTypeSchema.index({ slug: 1 }, { unique: true });
admissionTypeSchema.index({ isActive: 1 });
admissionTypeSchema.index({ displayOrder: 1 });

const AdmissionType = mongoose.model<IAdmissionType>('AdmissionType', admissionTypeSchema);

export default AdmissionType;
