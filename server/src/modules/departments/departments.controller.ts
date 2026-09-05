import { Request, Response, NextFunction } from 'express';
import * as service from './departments.service';

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.listDepartments());
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getDepartment(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await service.createDepartment(req.body));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.updateDepartment(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteDepartment(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
