import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Not authorized, no token' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({ message: 'Server configuration error: JWT_SECRET not set' });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as { id: string };
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401).json({ message: 'Not authorized, user not found' });
      return;
    }

    (req as any).user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token invalid or expired' });
  }
};
