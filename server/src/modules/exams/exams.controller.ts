import { Request, Response, NextFunction } from 'express';
import * as service from './exams.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.listExams(req.query.courseId as string | undefined));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await service.createExam(req.body));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.updateExam(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

export async function enterMarks(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.enterMarks(req.params.id, req.body, req.user?.id));
  } catch (err) {
    next(err);
  }
}

export async function getMarks(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getExamMarks(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function studentResults(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getResultsForStudent(req.params.studentId));
  } catch (err) {
    next(err);
  }
}
