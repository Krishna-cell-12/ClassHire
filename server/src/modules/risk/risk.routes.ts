import { Router } from 'express';
import { Role } from '@prisma/client';
import { verifyJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { riskListQuerySchema } from './risk.schema';
import * as controller from './risk.controller';

const router = Router();

router.use(verifyJwt);

// Admin/faculty only -- students must never see risk data, including their own (403, not
// just hidden UI).
router.get('/', requireRole(Role.ADMIN, Role.FACULTY), validate(riskListQuerySchema, 'query'), controller.list);

export default router;
