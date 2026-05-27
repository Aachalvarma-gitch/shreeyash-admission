import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
  name: string;
  code: string;
  category: mongoose.Types.ObjectId;
  parentCourse?: mongoose.Types.ObjectId;
  description?: string;
  duration: number;
  eligibility?: string;
  fees: number;
  seats: number;
  isActive: boolean;
  displayOrder: number;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

const courseSchema = new Schema<ICourse>(
  {
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Course code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    parentCourse: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
    },
    description: {
      type: String,
      trim: true,
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 year'],
    },
    eligibility: {
      type: String,
      trim: true,
    },
    fees: {
      type: Number,
      default: 0,
      min: [0, 'Fees cannot be negative'],
    },
    seats: {
      type: Number,
      default: 0,
      min: [0, 'Seats cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

courseSchema.index({ code: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ isActive: 1 });

const Course = mongoose.model<ICourse>('Course', courseSchema);

export default Course;