import { Router } from 'express';
import { Role } from '@prisma/client';
import { verifyJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { createFacultySchema, updateFacultySchema, listFacultyQuerySchema } from './faculty.schema';
import * as controller from './faculty.controller';
import { AppError } from '../../lib/AppError';
import { facultyIdForUser } from '../../lib/ownership';

const router = Router();

router.use(verifyJwt);

router.get('/', requireRole(Role.ADMIN), validate(listFacultyQuerySchema, 'query'), controller.list);

router.get('/:id', async (req, res, next) => {
  try {
    if (req.user!.role === Role.FACULTY) {
      const selfId = await facultyIdForUser(req.user!.id);
      if (selfId !== req.params.id) throw AppError.forbidden();
    } else if (req.user!.role !== Role.ADMIN) {
      throw AppError.forbidden();
    }
    next();
  } catch (err) {
    next(err);
  }
}, controller.getOne);

router.post('/', requireRole(Role.ADMIN), validate(createFacultySchema), controller.create);
router.patch('/:id', requireRole(Role.ADMIN), validate(updateFacultySchema), controller.update);
router.delete('/:id', requireRole(Role.ADMIN), controller.remove);

export default router;
