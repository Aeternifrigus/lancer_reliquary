import { Router } from 'express';
import { awardItem, getInventory } from '../controllers/itemController';
import { authenticate } from '../middleware/auth';

const router = Router();

// TODO: awarding should need a server-to-server or admin token, not just any player JWT
router.post('/:playerId', authenticate, awardItem);
router.get('/:playerId', getInventory);

export default router;
