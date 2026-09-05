import { Router } from 'express';
import { Role } from '@prisma/client';
import { verifyJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { createSessionSchema, markAttendanceSchema, listSessionsQuerySchema } from './attendance.schema';
import * as controller from './attendance.controller';
import * as service from './attendance.service';
import { AppError } from '../../lib/AppError';
import { facultyIdForUser, studentIdForUser, assertCourseOwnedByFaculty } from '../../lib/ownership';

const router = Router();

router.use(verifyJwt);

async function requireCourseAccess(req: any, res: any, next: any, courseId: string) {
  try {
    if (req.user.role === Role.FACULTY) {
      const facultyId = await facultyIdForUser(req.user.id);
      await assertCourseOwnedByFaculty(courseId, facultyId);
    } else if (req.user.role !== Role.ADMIN) {
      throw AppError.forbidden();
    }
    next();
  } catch (err) {
    next(err);
  }
}

router.post(
  '/sessions',
  requireRole(Role.ADMIN, Role.FACULTY),
  validate(createSessionSchema),
  (req, res, next) => requireCourseAccess(req, res, next, req.body.courseId),
  controller.createSession,
);

router.get(
  '/sessions',
  requireRole(Role.ADMIN, Role.FACULTY),
  validate(listSessionsQuerySchema, 'query'),
  (req, res, next) => requireCourseAccess(req, res, next, req.query.courseId as string),
  controller.listSessions,
);

router.post(
  '/sessions/:id/mark',
  requireRole(Role.ADMIN, Role.FACULTY),
  validate(markAttendanceSchema),
  async (req, res, next) => {
    try {
      const courseId = await service.getSessionCourseId(req.params.id);
      await requireCourseAccess(req, res, next, courseId);
    } catch (err) {
      next(err);
    }
  },
  controller.markAttendance,
);

router.get('/students/:studentId', async (req, res, next) => {
  try {
    if (req.user!.role === Role.STUDENT) {
      const selfId = await studentIdForUser(req.user!.id);
      if (selfId !== req.params.studentId) throw AppError.forbidden();
    } else if (req.user!.role === Role.FACULTY) {
      // faculty may view any student's attendance for advising purposes
    } else if (req.user!.role !== Role.ADMIN) {
      throw AppError.forbidden();
    }
    next();
  } catch (err) {
    next(err);
  }
}, controller.studentAttendance);

router.get(
  '/courses/:courseId/summary',
  requireRole(Role.ADMIN, Role.FACULTY),
  (req, res, next) => requireCourseAccess(req, res, next, req.params.courseId),
  controller.courseSummary,
);

export default router;
