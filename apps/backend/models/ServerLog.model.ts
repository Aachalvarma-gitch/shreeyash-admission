import mongoose, { Document, Schema } from 'mongoose';

export interface IServerLog extends Document {
  level: string;
  message: string;
  category: string;
  context: Record<string, any>;
  error?: string;
  createdAt: Date;
}

const serverLogSchema = new Schema<IServerLog>(
  {
    level: {
      type: String,
      required: true,
      enum: ['error', 'warn', 'info', 'debug', 'verbose'],
    },
    message: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    context: {
      type: Schema.Types.Mixed,
      default: {},
    },
    error: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    capped: { size: 1073741824, max: 100000 },
  }
);

serverLogSchema.index({ createdAt: -1 });
serverLogSchema.index({ level: 1, category: 1 });

export const ServerLog = mongoose.model<IServerLog>('ServerLog', serverLogSchema);
