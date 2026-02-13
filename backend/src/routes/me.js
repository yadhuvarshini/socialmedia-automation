import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    // req.user is already the MongoDB user object from requireAuth middleware
    if (!req.user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json(req.user);
  } catch (err) {
    console.error('Error in /me:', err);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

export default router;
