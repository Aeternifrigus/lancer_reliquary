import { Router } from 'express';
import {
  handleCreateSession,
  handleStartSession,
  handleEndSession,
  handleGetSession,
} from '../controllers/sessionController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', handleCreateSession);
router.get('/:id', handleGetSession);
router.patch('/:id/start', handleStartSession);
router.patch('/:id/end', handleEndSession);

export default router;
