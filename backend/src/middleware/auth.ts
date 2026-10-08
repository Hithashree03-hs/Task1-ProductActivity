import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

interface JwtPayload {
  userId: string;
}

const auth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        message: 'Authentication token missing',
      });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'task1_super_secret_change_later'
    ) as JwtPayload;

    req.userId = decoded.userId;

    next();
  } catch (error) {
    res.status(401).json({
      message: 'Invalid or expired authentication token',
    });
  }
};

export default auth;

export const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  try {
    const value = req.headers.authorization;
    if (value?.startsWith('Bearer ')) {
      const decoded = jwt.verify(value.slice(7), process.env.JWT_SECRET || 'task1_super_secret_change_later') as JwtPayload;
      req.userId = decoded.userId;
    }
  } catch { /* Invalid optional tokens are treated as anonymous. */ }
  next();
};
