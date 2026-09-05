import { Request, Response, NextFunction } from 'express';
import * as service from './fees.service';

export async function listSlabs(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.listFeeSlabs(req.query as any));
  } catch (err) {
    next(err);
  }
}

export async function createSlab(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await service.createFeeSlab(req.body));
  } catch (err) {
    next(err);
  }
}

export async function updateSlab(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.updateFeeSlab(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

export async function createPayment(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await service.recordPayment(req.body));
  } catch (err) {
    next(err);
  }
}

export async function listPayments(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.listPaymentsForStudent(req.query.studentId as string));
  } catch (err) {
    next(err);
  }
}

export async function studentStatus(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.computeFeeStatusForStudent(req.params.studentId));
  } catch (err) {
    next(err);
  }
}
