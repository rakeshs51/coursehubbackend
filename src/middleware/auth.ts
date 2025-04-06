import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import User from '../models/User';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: Types.ObjectId;
        role: string;
        [key: string]: any;
      };
    }
  }
}

export const protect: RequestHandler = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
    return;
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    
    // Get user from token and attach to req
    User.findById((decoded as any).id).lean()
      .then(user => {
        if (!user) {
          res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
          });
          return;
        }

        req.user = user;
        next();
      })
      .catch(err => next(err));
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

export const authorize = (...roles: string[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      let message = 'Not authorized to access this route';
      
      // Determine the specific error message based on the HTTP method and route
      if (req.method === 'POST' && req.originalUrl.includes('/chapters')) {
        message = 'Not authorized to add chapters to this course';
      } else if (req.method === 'PUT' && req.originalUrl.includes('/chapters')) {
        message = 'Not authorized to update chapters in this course';
      } else if (req.method === 'DELETE' && req.originalUrl.includes('/chapters')) {
        message = 'Not authorized to delete chapters from this course';
      }

      res.status(403).json({
        success: false,
        message
      });
      return;
    }

    next();
  };
};

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret-key') as { id: string };
    const user = await User.findById(decoded.id).lean();
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}; 