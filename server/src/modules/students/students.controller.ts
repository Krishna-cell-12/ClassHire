import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import * as service from './students.service';
import * as riskService from '../risk/risk.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.listStudents(req.query as any));
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getStudent(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await service.createStudent(req.body));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.updateStudent(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deactivateStudent(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function summary(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getStudentSummary(req.params.id);

    // Risk scores are an admin/faculty-only concept -- a student viewing their own summary
    // must not see (or know about) this field, even though the endpoint itself is shared.
    if (req.user?.role === Role.ADMIN || req.user?.role === Role.FACULTY) {
      const risk = await riskService.computeRiskForStudent(req.params.id);
      return res.json({ ...result, risk });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}
