import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { prisma } from '@/config/database';
import config from '@/config';
import { User } from '@openenglishtutor/shared/types';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required'
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Attach user to request
    req.user = {
      ...user,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined
    };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired'
      });
      return;
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (user) {
      req.user = {
        ...user,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined
      };
    }

    next();
  } catch (error) {
    // For optional auth, we don't return errors, just continue without user
    next();
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // For now, we don't have roles in our schema
    // This is a placeholder for future role-based access control
    next();
  };
};

export const generateToken = (user: { id: string; email: string }): string => {
  const payload = {
    userId: user.id,
    email: user.email
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
};

export const generateRefreshToken = (user: { id: string; email: string }): string => {
  const payload = {
    userId: user.id,
    email: user.email,
    type: 'refresh'
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '30d' } as jwt.SignOptions);
};

export const verifyRefreshToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload & { type?: string };
    
    if (decoded.type !== 'refresh') {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
};