import { Router } from 'express';
import { Role } from '@prisma/client';
import { verifyJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { AppError } from '../../lib/AppError';
import { facultyIdForUser, studentIdForUser, assertCourseOwnedByFaculty } from '../../lib/ownership';
import * as examsService from '../exams/exams.service';
import * as controller from './reports.controller';

const router = Router();

router.use(verifyJwt);

router.get('/students/:id/report-card.pdf', async (req, res, next) => {
  try {
    if (req.user!.role === Role.STUDENT) {
      const selfId = await studentIdForUser(req.user!.id);
      if (selfId !== req.params.id) throw AppError.forbidden();
    } else if (req.user!.role !== Role.ADMIN && req.user!.role !== Role.FACULTY) {
      throw AppError.forbidden();
    }
    next();
  } catch (err) {
    next(err);
  }
}, controller.studentReportCard);

router.get(
  '/attendance/course/:courseId.xlsx',
  requireRole(Role.ADMIN, Role.FACULTY),
  async (req, res, next) => {
    try {
      if (req.user!.role === Role.FACULTY) {
        const facultyId = await facultyIdForUser(req.user!.id);
        await assertCourseOwnedByFaculty(req.params.courseId, facultyId);
      }
      next();
    } catch (err) {
      next(err);
    }
  },
  controller.courseAttendanceExcel,
);

router.get('/fees/defaulters.xlsx', requireRole(Role.ADMIN), controller.feeDefaultersExcel);

router.get(
  '/results/exam/:examId.pdf',
  requireRole(Role.ADMIN, Role.FACULTY),
  async (req, res, next) => {
    try {
      if (req.user!.role === Role.FACULTY) {
        const courseId = await examsService.getExamCourseId(req.params.examId);
        const facultyId = await facultyIdForUser(req.user!.id);
        await assertCourseOwnedByFaculty(courseId, facultyId);
      }
      next();
    } catch (err) {
      next(err);
    }
  },
  controller.courseResultSheetPdf,
);

router.get('/students/export.xlsx', requireRole(Role.ADMIN), controller.studentDirectoryExcel);

export default router;
