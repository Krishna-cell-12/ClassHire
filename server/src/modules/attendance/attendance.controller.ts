import { Request, Response, NextFunction } from 'express';
import * as service from './attendance.service';

export async function createSession(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await service.createSession(req.body));
  } catch (err) {
    next(err);
  }
}

export async function listSessions(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.listSessions(req.query.courseId as string));
  } catch (err) {
    next(err);
  }
}

export async function markAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.markAttendance(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

export async function studentAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.attendanceForStudent(req.params.studentId));
  } catch (err) {
    next(err);
  }
}

export async function courseSummary(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.courseAttendanceSummary(req.params.courseId));
  } catch (err) {
    next(err);
  }
}
