import { Request, Response, NextFunction } from 'express';
import * as service from './faculty.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.listFaculty(req.query as any));
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getFaculty(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await service.createFaculty(req.body));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.updateFaculty(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deactivateFaculty(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
