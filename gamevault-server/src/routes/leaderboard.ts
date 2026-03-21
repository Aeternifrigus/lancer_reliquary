import { Router } from 'express';
import { handleGetLeaderboard, handleGetPlayerRank } from '../controllers/leaderboardController';

const router = Router();

router.get('/', handleGetLeaderboard);
router.get('/:playerId', handleGetPlayerRank);

export default router;
