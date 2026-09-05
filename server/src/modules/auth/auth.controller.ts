import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { AppError } from '../../lib/AppError';

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function meHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw AppError.unauthorized();
    const result = await authService.getMe(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
