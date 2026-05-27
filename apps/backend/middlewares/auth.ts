import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import Session from '../models/Session.model.js';
import type { IUser } from '../types/index.js';

type AuthRequest = Request & {
  user: IUser;
  session?: { _id: string; isActive: boolean; save(): Promise<void> };
  correlationId: string;
};

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Not authorized to access this route',
      });
      return;
    }

    try {

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };


      const session = await Session.findOne({
        userId: decoded.id,
        accessToken: token,
        isActive: true,
      });

      if (!session) {
        res.status(401).json({
          success: false,
          error: 'Session expired or invalid',
        });
        return;
      }


      session.lastActivity = new Date();
      await session.save();


      const user = await User.findById(decoded.id).select('-password').populate('role');

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      if (!user.isActive) {
        res.status(401).json({
          success: false,
          error: 'User account is deactivated',
        });
        return;
      }


      req.user = user;
      req.session = session;


      if (user.mustChangePassword) {

        const allowedPaths = [
          '/api/v1/auth/profile',
          '/api/v1/auth/logout',
          '/api/v1/auth/change-password',
          '/api/auth/profile',
          '/api/auth/logout',
          '/api/auth/change-password'
        ];


        const requestPath = req.originalUrl.split('?')[0];

        if (!allowedPaths.includes(requestPath)) {
          res.status(403).json({
            success: false,
            error: 'PASSWORD_CHANGE_REQUIRED',
            message: 'You must change your password before accessing this resource',
          });
          return;
        }
      }

      next();
    } catch (err) {
      res.status(401).json({
        success: false,
        error: 'Not authorized to access this route',
      });
      return;
    }
  } catch (error) {
    next(error);
  }
};

export const auth = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      res.status(403).json({
        success: false,
        error: 'User role not found',
      });
      return;
    }

    const userRole = typeof req.user.role === 'object' && 'name' in req.user.role
      ? req.user.role.name
      : '';


    if (userRole === 'Super Admin') {
      next();
      return;
    }

    if (!roles.includes(userRole)) {
      res.status(403).json({
        success: false,
        error: `User role '${userRole}' is not authorized to access this route`,
      });
      return;
    }

    next();
  };
};

export const checkPermission = (resource: string, action: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      res.status(403).json({
        success: false,
        error: 'User role not found',
      });
      return;
    }

    const userRole = typeof req.user.role === 'object' && 'name' in req.user.role
      ? req.user.role.name
      : '';


    if (userRole === 'Super Admin') {
      next();
      return;
    }

    const role = typeof req.user.role === 'object' && 'permissions' in req.user.role
      ? req.user.role
      : null;

    if (!role) {
      res.status(403).json({
        success: false,
        error: 'User permissions not found',
      });
      return;
    }

    const permission = role.permissions.find(
      (p: any) => p.resource === resource && p.actions.includes(action)
    );

    if (!permission) {
      res.status(403).json({
        success: false,
        error: `You don't have permission to ${action} ${resource}`,
      });
      return;
    }

    next();
  };
};