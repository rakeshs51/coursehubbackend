// utils/routeHandler.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

export const wrapHandler = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void> | void
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};