import { Router } from 'express';
import { verifyJwt } from '../../middleware/auth';
import * as controller from './dashboard.controller';

const router = Router();

router.use(verifyJwt);
router.get('/', controller.overview);

export default router;
