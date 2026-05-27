import mongoose, { Schema, Document } from 'mongoose';

export interface IContactInquiry extends Document {
  name: string;
  email: string;
  mobile: string;
  subject: string;
  message: string;
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
  response?: string;
  respondedBy?: mongoose.Types.ObjectId;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const contactInquirySchema = new Schema<IContactInquiry>(
  { 
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'RESOLVED', 'REJECTED'],
      default: 'PENDING',
    },
    response: {
      type: String,
      trim: true,
    },
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

contactInquirySchema.index({ status: 1 });
contactInquirySchema.index({ createdAt: -1 });
contactInquirySchema.index({ email: 1 });

const ContactInquiry = mongoose.model<IContactInquiry>('ContactInquiry', contactInquirySchema);

export default ContactInquiry;