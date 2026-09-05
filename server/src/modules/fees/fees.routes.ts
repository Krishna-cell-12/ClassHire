import { Router } from 'express';
import { Role } from '@prisma/client';
import { verifyJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { createFeeSlabSchema, updateFeeSlabSchema, createPaymentSchema } from './fees.schema';
import * as controller from './fees.controller';
import { AppError } from '../../lib/AppError';
import { studentIdForUser } from '../../lib/ownership';

const router = Router();

router.use(verifyJwt);

router.get('/slabs', controller.listSlabs);
router.post('/slabs', requireRole(Role.ADMIN), validate(createFeeSlabSchema), controller.createSlab);
router.patch('/slabs/:id', requireRole(Role.ADMIN), validate(updateFeeSlabSchema), controller.updateSlab);

router.post('/payments', requireRole(Role.ADMIN), validate(createPaymentSchema), controller.createPayment);

router.get('/payments', async (req, res, next) => {
  try {
    const studentId = req.query.studentId as string;
    if (req.user!.role === Role.STUDENT) {
      const selfId = await studentIdForUser(req.user!.id);
      if (selfId !== studentId) throw AppError.forbidden();
    } else if (req.user!.role !== Role.ADMIN) {
      throw AppError.forbidden();
    }
    next();
  } catch (err) {
    next(err);
  }
}, controller.listPayments);

router.get('/students/:studentId/status', async (req, res, next) => {
  try {
    if (req.user!.role === Role.STUDENT) {
      const selfId = await studentIdForUser(req.user!.id);
      if (selfId !== req.params.studentId) throw AppError.forbidden();
    } else if (req.user!.role !== Role.ADMIN) {
      throw AppError.forbidden();
    }
    next();
  } catch (err) {
    next(err);
  }
}, controller.studentStatus);

export default router;
