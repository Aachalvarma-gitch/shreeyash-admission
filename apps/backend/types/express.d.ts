import "express";

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      startTime: number;
      user?: {
        _id: string;
        email: string;
        role: { _id: string; name: string };
      };
      session?: {
        _id: string;
        isActive: boolean;
        save(): Promise<void>;
      };
    }
  }
}