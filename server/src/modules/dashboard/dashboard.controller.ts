import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../../lib/AppError';
import * as service from './dashboard.service';

/**
 * One endpoint, three shapes. The client can't pick which role's dashboard it
 * gets -- that comes from the verified JWT -- so a student can never request the
 * admin roll-up by changing a query parameter.
 */
export async function overview(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw AppError.unauthorized();

    switch (req.user.role) {
      case Role.ADMIN:
        return res.json(await service.adminOverview());
      case Role.FACULTY:
        return res.json(await service.facultyOverview(req.user.id));
      case Role.STUDENT:
        return res.json(await service.studentOverview(req.user.id));
      default:
        throw AppError.forbidden();
    }
  } catch (err) {
    next(err);
  }
}
