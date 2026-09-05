import { Router } from 'express';
import { Role } from '@prisma/client';
import { loginHandler, registerHandler, meHandler } from './auth.controller';
import { loginSchema, registerSchema } from './auth.schema';
import { validate } from '../../middleware/validate';
import { verifyJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

router.post('/login', validate(loginSchema), loginHandler);
router.post('/register', verifyJwt, requireRole(Role.ADMIN), validate(registerSchema), registerHandler);
router.get('/me', verifyJwt, meHandler);

export default router;
