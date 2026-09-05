import { Router } from 'express';
import { Role } from '@prisma/client';
import { verifyJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { createExamSchema, updateExamSchema, enterMarksSchema, listExamsQuerySchema } from './exams.schema';
import * as controller from './exams.controller';
import * as service from './exams.service';
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

router.get('/', validate(listExamsQuerySchema, 'query'), controller.list);

router.post(
  '/',
  requireRole(Role.ADMIN, Role.FACULTY),
  validate(createExamSchema),
  (req, res, next) => requireCourseAccess(req, res, next, req.body.courseId),
  controller.create,
);

router.patch(
  '/:id',
  requireRole(Role.ADMIN, Role.FACULTY),
  validate(updateExamSchema),
  async (req, res, next) => {
    try {
      const courseId = await service.getExamCourseId(req.params.id);
      await requireCourseAccess(req, res, next, courseId);
    } catch (err) {
      next(err);
    }
  },
  controller.update,
);

router.post(
  '/:id/marks',
  requireRole(Role.ADMIN, Role.FACULTY),
  validate(enterMarksSchema),
  async (req, res, next) => {
    try {
      const courseId = await service.getExamCourseId(req.params.id);
      await requireCourseAccess(req, res, next, courseId);
    } catch (err) {
      next(err);
    }
  },
  controller.enterMarks,
);

router.get(
  '/:id/marks',
  requireRole(Role.ADMIN, Role.FACULTY),
  async (req, res, next) => {
    try {
      const courseId = await service.getExamCourseId(req.params.id);
      await requireCourseAccess(req, res, next, courseId);
    } catch (err) {
      next(err);
    }
  },
  controller.getMarks,
);

router.get('/students/:studentId/results', async (req, res, next) => {
  try {
    if (req.user!.role === Role.STUDENT) {
      const selfId = await studentIdForUser(req.user!.id);
      if (selfId !== req.params.studentId) throw AppError.forbidden();
    } else if (req.user!.role !== Role.ADMIN && req.user!.role !== Role.FACULTY) {
      throw AppError.forbidden();
    }
    next();
  } catch (err) {
    next(err);
  }
}, controller.studentResults);

export default router;
