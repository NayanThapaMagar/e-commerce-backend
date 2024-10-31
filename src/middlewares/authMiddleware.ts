import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables.');
}

interface ITokenPayload {
  id: string;
  role: 'user' | 'admin' | 'superadmin';
}

declare global {
  namespace Express {
    interface Request {
      user?: ITokenPayload;
    }
  }
}

// Middleware to verify token
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ success: false, message: 'User not authenticated' });
    return;
  }

  try {

    const decoded = jwt.verify(token, JWT_SECRET) as ITokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ success: false, message: 'User not authenticated' });
    return;
  }
};

// Role-based access control
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Access denied, admin only' });
    return;
  }
  next();
};

export const isUser = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'user') {
    res.status(403).json({ success: false, message: 'Access denied, user only' });
    return;
  }
  next();
};

export const isSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'superadmin') {
    res.status(403).json({ success: false, message: 'Access denied, superadmin only' });
    return;
  }
  next();
};
