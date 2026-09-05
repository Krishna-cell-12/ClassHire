import { Request, Response, NextFunction } from 'express';
import * as service from './courses.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.listCourses(req.query as any));
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getCourse(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await service.createCourse(req.body));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.updateCourse(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteCourse(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getStudents(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getCourseStudents(req.params.id));
  } catch (err) {
    next(err);
  }
}
