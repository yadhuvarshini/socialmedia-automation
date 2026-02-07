import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Integration } from '../models/Integration.js';

const router = Router();
router.use(requireAuth);

// Get all integrations for the current user
router.get('/', async (req, res) => {
  try {
    const integrations = await Integration.find({ userId: req.user._id, isActive: true })
      .sort({ platform: 1 })
      .lean();
    res.json(integrations);
  } catch (err) {
    console.error('Error fetching integrations:', err);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

// Get a specific integration
router.get('/:platform', async (req, res) => {
  try {
    const integration = await Integration.findOne({
      userId: req.user._id,
      platform: req.params.platform,
      isActive: true,
    }).lean();

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Don't send sensitive tokens in response
    const { accessToken, accessTokenSecret, refreshToken, ...safeIntegration } = integration;
    res.json(safeIntegration);
  } catch (err) {
    console.error('Error fetching integration:', err);
    res.status(500).json({ error: 'Failed to fetch integration' });
  }
});

// Disconnect/delete an integration
router.delete('/:platform', async (req, res) => {
  try {
    const integration = await Integration.findOneAndUpdate(
      {
        userId: req.user._id,
        platform: req.params.platform,
      },
      { isActive: false },
      { new: true }
    );

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json({ ok: true, message: 'Integration disconnected successfully' });
  } catch (err) {
    console.error('Error disconnecting integration:', err);
    res.status(500).json({ error: 'Failed to disconnect integration' });
  }
});

export default router;
