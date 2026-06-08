import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { sendError } from '../utils/response';

// Extend Express Request to carry decoded user info
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Verifies the JWT token in the Authorization header.
 * Attaches decoded payload to req.user on success.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers['authorization'];

  if (!token) {
    sendError(res, StatusCodes.UNAUTHORIZED, 'Access denied. No token provided.');
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid or expired token.');
  }
};

/**
 * Ensures the authenticated user has the maintainer role.
 * Must be used after authenticate middleware.
 */
export const requireMaintainer = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'maintainer') {
    sendError(res, StatusCodes.FORBIDDEN, 'Access denied. Maintainer role required.');
    return;
  }
  next();
};
