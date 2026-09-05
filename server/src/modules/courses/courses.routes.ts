import { Router } from 'express';
import { Role } from '@prisma/client';
import { verifyJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { createCourseSchema, updateCourseSchema, listCoursesQuerySchema } from './courses.schema';
import * as controller from './courses.controller';
import { AppError } from '../../lib/AppError';
import { facultyIdForUser, assertCourseOwnedByFaculty } from '../../lib/ownership';

const router = Router();

router.use(verifyJwt);

router.get('/', validate(listCoursesQuerySchema, 'query'), controller.list);
router.get('/:id', controller.getOne);

router.get('/:id/students', async (req, res, next) => {
  try {
    if (req.user!.role === Role.FACULTY) {
      const facultyId = await facultyIdForUser(req.user!.id);
      await assertCourseOwnedByFaculty(req.params.id, facultyId);
    } else if (req.user!.role !== Role.ADMIN) {
      throw AppError.forbidden();
    }
    next();
  } catch (err) {
    next(err);
  }
}, controller.getStudents);

router.post('/', requireRole(Role.ADMIN), validate(createCourseSchema), controller.create);
router.patch('/:id', requireRole(Role.ADMIN), validate(updateCourseSchema), controller.update);
router.delete('/:id', requireRole(Role.ADMIN), controller.remove);

export default router;
