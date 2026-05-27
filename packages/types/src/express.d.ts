import type { Request, Response, ParamsDictionary } from "express";

interface MongooseDocument {
  _id: unknown;
  populate(path: string, select?: string): Promise<this>;
  toObject(): Record<string, unknown>;
}

export interface AuthUser extends MongooseDocument {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: { _id: string; name: string };
}

export interface AuthSession extends MongooseDocument, ISession {}

interface ISession {
  _id: string;
  isActive: boolean;
  save(): Promise<void>;
}

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      startTime: number;
      user?: AuthUser;
      session?: AuthSession;
    }
  }
}

export type TypedRequest<B = unknown> = any;

export type AuthRequest<B = unknown> = any;

export type AuthResponse = any;

export type ApiRequest<P extends ParamsDictionary = ParamsDictionary, B = unknown> = any;

export type ApiResponse = any;