import { Router } from 'express';
import { Role } from '@prisma/client';
import { verifyJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { createDepartmentSchema, updateDepartmentSchema } from './departments.schema';
import * as controller from './departments.controller';

const router = Router();

router.use(verifyJwt);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', requireRole(Role.ADMIN), validate(createDepartmentSchema), controller.create);
router.patch('/:id', requireRole(Role.ADMIN), validate(updateDepartmentSchema), controller.update);
router.delete('/:id', requireRole(Role.ADMIN), controller.remove);

export default router;
