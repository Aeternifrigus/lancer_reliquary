import { Router } from 'express';
import { getPlayer, getMe } from '../controllers/playerController';
import { authenticate } from '../middleware/auth';

const router = Router();

// /me must come before /:id or Express will try to cast "me" as an ObjectId
router.get('/me', authenticate, getMe);
router.get('/:id', getPlayer);

export default router;
