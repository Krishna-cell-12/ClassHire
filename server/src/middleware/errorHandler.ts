import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../lib/AppError';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { message: 'Route not found', code: 'ROUTE_NOT_FOUND' } });
}

// Human-readable singular label for the entity being deleted (Prisma's meta.modelName).
const ENTITY_LABELS: Record<string, string> = {
  Department: 'department',
  Course: 'course',
  Student: 'student',
  Faculty: 'faculty member',
  FeeSlab: 'fee slab',
  Exam: 'exam',
};

// Human-readable plural label for the dependent row blocking the delete, parsed from the
// FK constraint name (e.g. "Student_departmentId_fkey" -> "Student").
const DEPENDENT_LABELS: Record<string, string> = {
  Student: 'students',
  Faculty: 'faculty',
  Course: 'courses',
  Enrollment: 'enrollments',
  FeeSlab: 'fee slabs',
  FeePayment: 'fee payments',
  AttendanceSession: 'attendance sessions',
  AttendanceRecord: 'attendance records',
  Exam: 'exams',
  ResultMark: 'result records',
  Department: 'departments',
  User: 'user accounts',
};

function fkConflictMessage(err: Prisma.PrismaClientKnownRequestError): string {
  const entityModel = typeof err.meta?.modelName === 'string' ? err.meta.modelName : undefined;
  const fieldName = typeof err.meta?.field_name === 'string' ? err.meta.field_name : undefined;
  const blockingModel = fieldName?.match(/^([A-Za-z]+)_/)?.[1];

  const entityLabel = (entityModel && ENTITY_LABELS[entityModel]) ?? 'record';
  const dependentLabel = (blockingModel && DEPENDENT_LABELS[blockingModel]) ?? 'other records';

  return `Cannot delete: this ${entityLabel} still has ${dependentLabel} linked to it.`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { message: err.message, code: err.code } });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: { message: `Duplicate value for: ${err.meta?.target}`, code: 'CONFLICT' },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { message: 'Record not found', code: 'NOT_FOUND' } });
    }
    if (err.code === 'P2003') {
      return res.status(409).json({
        error: { message: fkConflictMessage(err), code: 'FK_CONSTRAINT' },
      });
    }
  }

  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
}
