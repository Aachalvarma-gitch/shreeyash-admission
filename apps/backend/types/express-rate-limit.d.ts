declare module "express-rate-limit" {
  import { RequestHandler } from "express";

  interface RateLimitOptions {
    windowMs?: number;
    max?: number | ((req: Request) => number);
    message?: unknown;
    statusCode?: number;
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
  }

  interface RateLimitRequestHandler extends RequestHandler {
    resetKey: (key: string) => void;
    getKey: (key: string) => unknown;
  }

  function rateLimit(options?: RateLimitOptions): RateLimitRequestHandler;
  export = rateLimit;
}