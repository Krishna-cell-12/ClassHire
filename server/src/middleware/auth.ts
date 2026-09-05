import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../lib/AppError';
import { Role } from '@prisma/client';

interface JwtPayload {
  sub: string;
  role: Role;
  email: string;
}

export function verifyJwt(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Missing or malformed Authorization header'));
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    next(AppError.unauthorized('Invalid or expired token'));
  }
}
