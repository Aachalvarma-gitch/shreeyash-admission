declare module "xss-clean" {
  import { RequestHandler } from "express";

  interface xssClean {
    (): RequestHandler;
  }

  const xssClean: xssClean;
  export = xssClean;
}