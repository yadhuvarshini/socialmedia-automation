import { Router } from 'express';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { getMemberId } from '../services/linkedin.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const u = req.user;
  res.json({
    id: u._id,
    profile: u.profile,
  });
});

export default router;
