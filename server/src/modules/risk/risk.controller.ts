import { Request, Response, NextFunction } from 'express';
import * as service from './risk.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.listStudentRisk(req.query as any));
  } catch (err) {
    next(err);
  }
}
