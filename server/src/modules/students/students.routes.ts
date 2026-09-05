import { Router } from 'express';
import { Role } from '@prisma/client';
import { verifyJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { createStudentSchema, updateStudentSchema, listStudentsQuerySchema } from './students.schema';
import { nlSearchBodySchema } from './nlSearch.schema';
import * as controller from './students.controller';
import * as nlSearchController from './nlSearch.controller';
import { AppError } from '../../lib/AppError';
import { studentIdForUser } from '../../lib/ownership';

const router = Router();

router.use(verifyJwt);

function selfOrElevated() {
  return async (req: any, res: any, next: any) => {
    try {
      if (req.user.role === Role.STUDENT) {
        const selfId = await studentIdForUser(req.user.id);
        if (selfId !== req.params.id) throw AppError.forbidden();
      } else if (req.user.role !== Role.ADMIN && req.user.role !== Role.FACULTY) {
        throw AppError.forbidden();
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

router.get('/', requireRole(Role.ADMIN, Role.FACULTY), validate(listStudentsQuerySchema, 'query'), controller.list);
// Same role guard as the risk dashboard -- students must never reach this, even by direct call.
router.post('/search-nl', requireRole(Role.ADMIN, Role.FACULTY), validate(nlSearchBodySchema), nlSearchController.search);
router.get('/:id', selfOrElevated(), controller.getOne);
router.get('/:id/summary', selfOrElevated(), controller.summary);
router.post('/', requireRole(Role.ADMIN), validate(createStudentSchema), controller.create);
router.patch('/:id', requireRole(Role.ADMIN), validate(updateStudentSchema), controller.update);
router.delete('/:id', requireRole(Role.ADMIN), controller.remove);

export default router;
