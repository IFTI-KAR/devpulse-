import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { sendError } from '../utils/response';

/**
 * Centralized error handler — catches both sync and async errors
 * forwarded via next(err). Must be registered last in Express.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[ErrorHandler]', err.stack ?? err.message);
  sendError(
    res,
    StatusCodes.INTERNAL_SERVER_ERROR,
    'An unexpected server error occurred.',
    process.env.NODE_ENV === 'development' ? err.message : undefined
  );
};
