import mongoose, { Schema, Document } from 'mongoose';

export type ApplicationStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'REVISION_REQUESTED'
  | 'MERIT_LIST'
  | 'SEAT_ALLOCATED'
  | 'FEE_PAID'
  | 'ADMISSION_CONFIRMED';

export type AdmissionTypeValue = 
  | 'POLYTECHNIC'
  | 'ENGINEERING_FIRST_YEAR'
  | 'DIRECT_SECOND_YEAR'
  | 'DIRECT_SECOND_YEAR_DIPLOMA'
  | 'DIRECT_SECOND_YEAR_FE'
  | 'COLLEGE_TRANSFER'
  | 'BRANCH_CHANGE';

export type DocumentType =
  | 'tenth_marksheet'
  | 'twelfth_marksheet'
  | 'cet_result'
  | 'jee_result'
  | 'photo'
  | 'leaving_certificate'
  | 'aadhaar_card'
  | 'passport_photo'
  | 'cet_jee_scorecard'
  | 'diploma_marksheet'
  | 'diploma_result'
  | 'diploma_certificate'
  | 'previous_college_bonafide'
  | 'previous_year_marksheet'
  | 'transfer_certificate'
  | 'migration_certificate'
  | 'fee_receipt'
  | 'first_year_marksheet';

export const ALL_DOCUMENT_TYPES: DocumentType[] = [
  'tenth_marksheet', 'twelfth_marksheet', 'cet_result', 'jee_result', 'photo',
  'leaving_certificate', 'aadhaar_card', 'passport_photo', 'cet_jee_scorecard',
  'diploma_marksheet', 'diploma_result', 'diploma_certificate',
  'previous_college_bonafide', 'previous_year_marksheet', 'transfer_certificate',
  'migration_certificate', 'fee_receipt', 'first_year_marksheet',
];

export interface IDocument {
  type: DocumentType;
  url: string;
  publicId?: string;
  uploadedAt: Date;
}

export interface IStatusHistory {
  status: ApplicationStatus;
  changedAt: Date;
  changedBy?: mongoose.Types.ObjectId;
  reason?: string;
}

export interface IApplication extends Document {
  applicationId: string;
  user: mongoose.Types.ObjectId;

  name: string;
  email: string;
  address: string;

  admissionType?: AdmissionTypeValue;

  tenthMarks?: number;
  twelfthMarks?: number;
  cetScore?: number;
  jeeScore?: number;

  diplomaCollege?: string;
  diplomaCgpa?: number;
  diplomaPercentage?: number;
  diplomaYearOfPassing?: number;

  transferType?: 'TRANSFER' | 'BRANCH_CHANGE' | 'COLLEGE_CHANGE';
  previousCollegeName?: string;
  previousCollegeAddress?: string;

  documents: IDocument[];

  category?: mongoose.Types.ObjectId;
  primaryCourse?: mongoose.Types.ObjectId;
  secondaryCourse?: mongoose.Types.ObjectId;

  previousCategory?: mongoose.Types.ObjectId;

  category2?: mongoose.Types.ObjectId;
  primaryCourse2?: mongoose.Types.ObjectId;
  secondaryCourse2?: mongoose.Types.ObjectId;

  status: ApplicationStatus;
  statusHistory: IStatusHistory[];

  meritRank?: number;
  allocatedCourse?: mongoose.Types.ObjectId;
  paymentDetails?: {
    amount: number;
    transactionId?: string;
    paidAt?: Date;
    paymentStatus: 'pending' | 'paid' | 'failed';
  };

  reviewNotes?: string;
  rejectedReason?: string;
  submittedAt?: Date;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

export const ADMISSION_PREFIX: Record<string, string> = {
  POLYTECHNIC: 'POL',
  ENGINEERING_FIRST_YEAR: 'ENG',
  DIRECT_SECOND_YEAR: 'DSE',
  DIRECT_SECOND_YEAR_DIPLOMA: 'DSE',
  DIRECT_SECOND_YEAR_FE: 'DSF',
  COLLEGE_TRANSFER: 'CTR',
  BRANCH_CHANGE: 'BCH',
};

const applicationSchema = new Schema<IApplication>(
  {
    applicationId: {
      type: String,
      unique: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },

    admissionType: {
      type: String,
      enum: ['POLYTECHNIC', 'ENGINEERING_FIRST_YEAR', 'DIRECT_SECOND_YEAR', 'DIRECT_SECOND_YEAR_DIPLOMA', 'DIRECT_SECOND_YEAR_FE', 'COLLEGE_TRANSFER', 'BRANCH_CHANGE'],
    },

    tenthMarks: {
      type: Number,
      min: [0, '10th marks cannot be negative'],
      max: [100, '10th marks cannot exceed 100'],
    },
    twelfthMarks: {
      type: Number,
      min: [0, '12th marks cannot be negative'],
      max: [100, '12th marks cannot exceed 100'],
    },
    cetScore: {
      type: Number,
      min: [0, 'CET score cannot be negative'],
    },
    jeeScore: {
      type: Number,
      min: [0, 'JEE score cannot be negative'],
    },

    diplomaCollege: { type: String, trim: true },
    diplomaCgpa: { type: Number, min: 0 },
    diplomaPercentage: { type: Number, min: 0, max: 100 },
    diplomaYearOfPassing: { type: Number },

    transferType: {
      type: String,
      enum: ['TRANSFER', 'BRANCH_CHANGE', 'COLLEGE_CHANGE'],
    },
    previousCollegeName: { type: String, trim: true },
    previousCollegeAddress: { type: String, trim: true },

    documents: [
      {
        type: {
          type: String,
          enum: ALL_DOCUMENT_TYPES,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        publicId: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    primaryCourse: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
    },
    secondaryCourse: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
    },

    previousCategory: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },

    category2: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    primaryCourse2: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
    },
    secondaryCourse2: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
    },

    status: {
      type: String,
      enum: [
        'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED',
        'REVISION_REQUESTED', 'MERIT_LIST', 'SEAT_ALLOCATED', 'FEE_PAID',
        'ADMISSION_CONFIRMED',
      ],
      default: 'DRAFT',
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: [
            'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED',
            'REVISION_REQUESTED', 'MERIT_LIST', 'SEAT_ALLOCATED', 'FEE_PAID',
            'ADMISSION_CONFIRMED',
          ],
          required: true,
        },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: String,
      },
    ],

    meritRank: Number,
    allocatedCourse: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
    },
    paymentDetails: {
      amount: { type: Number, default: 0 },
      transactionId: String,
      paidAt: Date,
      paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending',
      },
    },

    reviewNotes: String,
    rejectedReason: String,
    submittedAt: Date,

    isActive: {
      type: Boolean,
      default: true,
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

applicationSchema.index({ applicationId: 1 }, { unique: true });
applicationSchema.index({ user: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ email: 1 });
applicationSchema.index({ admissionType: 1 });
applicationSchema.index({ category: 1 });
applicationSchema.index({ primaryCourse: 1 });
applicationSchema.index({ meritRank: 1 });
applicationSchema.index({ createdAt: -1 });

applicationSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('Application').countDocuments();
    const year = new Date().getFullYear();
    const prefix = ADMISSION_PREFIX[this.admissionType || ''] || 'CAP';
    this.applicationId = `${prefix}-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

const Application = mongoose.model<IApplication>('Application', applicationSchema);

export default Application;
