import express from 'express';
import { generateContent } from '../services/gemini.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/generate', requireAuth, async (req, res) => {
    try {
        const { topic, platform, imagePrompt } = req.body;

        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        const result = await generateContent(topic, platform, imagePrompt);

        if (result.error) {
            return res.status(500).json(result);
        }

        res.json(result);
    } catch (err) {
        console.error('AI Route Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
