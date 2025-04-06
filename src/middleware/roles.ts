import { Request, Response, NextFunction } from 'express';

export const isCreator = (req: Request, res: Response, next: NextFunction) => {
  // Check if user object exists
  if (!req.user) {
    console.log('No user object found in request');
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Check if user has role property
  if (!req.user.role) {
    console.log('No role found in user object:', req.user);
    return res.status(401).json({ message: 'Invalid user object' });
  }

  // Check if user is a creator
  if (req.user.role !== 'creator') {
    console.log('User role is not creator:', req.user.role);
    return res.status(403).json({ message: 'Access denied. Creator role required.' });
  }

  next();
}; 