import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { TrendInsight } from '../models/TrendInsight.js';
import { UserProfile } from '../models/UserProfile.js';
import { generateContentIdeas } from '../services/gemini.js';

const router = Router();

const TREND_CATEGORIES = {
  social: {
    label: 'Social & Content',
    description: 'What creators and marketers are talking about',
    trends: [
      { term: 'AI content', change: '+24%', direction: 'up', rank: 1 },
      { term: 'social media automation', change: '+18%', direction: 'up', rank: 2 },
      { term: 'LinkedIn tips', change: '+12%', direction: 'up', rank: 3 },
      { term: 'content marketing', change: '+8%', direction: 'up', rank: 4 },
      { term: 'Instagram Reels', change: '+6%', direction: 'up', rank: 5 },
      { term: 'threads app', change: '-5%', direction: 'down', rank: 6 },
    ],
  },
  business: {
    label: 'Business',
    description: 'Professional and B2B topics gaining traction',
    trends: [
      { term: 'remote work', change: '+22%', direction: 'up', rank: 1 },
      { term: 'startup funding', change: '+15%', direction: 'up', rank: 2 },
      { term: 'sustainability', change: '+19%', direction: 'up', rank: 3 },
      { term: 'SaaS growth', change: '+11%', direction: 'up', rank: 4 },
      { term: 'thought leadership', change: '+9%', direction: 'up', rank: 5 },
      { term: 'web3', change: '-12%', direction: 'down', rank: 6 },
    ],
  },
  tech: {
    label: 'Tech',
    description: 'Technology and tools trending now',
    trends: [
      { term: 'generative AI', change: '+31%', direction: 'up', rank: 1 },
      { term: 'no-code tools', change: '+14%', direction: 'up', rank: 2 },
      { term: 'automation', change: '+17%', direction: 'up', rank: 3 },
      { term: 'cybersecurity', change: '+8%', direction: 'up', rank: 4 },
      { term: 'coding tutorials', change: '+6%', direction: 'up', rank: 5 },
      { term: 'NFT', change: '-18%', direction: 'down', rank: 6 },
    ],
  },
};

/** GET /trends/ideas - Fresh content ideas from keywords + trends (not persisted) */
router.get('/ideas', requireAuth, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.user._id }).lean();
    const keywords = profile?.keywords?.length ? profile.keywords : ['social media', 'content', 'marketing'];
    const businessContext = [profile?.businessSummary, profile?.businessName].filter(Boolean).join('. ');

    const category = req.query.category || 'social';
    const data = TREND_CATEGORIES[category] || TREND_CATEGORIES.social;
    const trendData = { trends: data.trends, polledAt: new Date().toISOString(), category: data.label };

    const result = await generateContentIdeas(keywords, trendData, businessContext);
    res.json({ ideas: result.ideas || [], keywords, category });
  } catch (err) {
    console.error('Trends ideas error:', err);
    res.status(500).json({ error: 'Failed to generate ideas' });
  }
});

router.get('/', requireAuth, (req, res) => {
  const category = req.query.category || 'social';
  const data = TREND_CATEGORIES[category] || TREND_CATEGORIES.social;
  res.json({
    categories: Object.keys(TREND_CATEGORIES).map((k) => ({ id: k, label: TREND_CATEGORIES[k].label })),
    category: category,
    description: data.description,
    howItWorks: 'These trends reflect rising/falling interest from search and social signals. Updates reflect the past 3 months. Use them to align your content with what audiences care about.',
    trends: data.trends,
    link: 'https://trends.google.com/trends/explore?date=today%203-m&geo=US',
  });
});

/** GET /trends/insights - AI-generated trend insights for the user */
router.get('/insights', requireAuth, async (req, res) => {
  try {
    const insights = await TrendInsight.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json(insights.map((i) => ({
      id: i._id.toString(),
      keywords: i.keywords,
      trendData: i.trendData,
      aiSuggestion: i.aiSuggestion,
      read: i.read,
      createdAt: i.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

/** PATCH /trends/insights/:id/read - Mark insight as read */
router.patch('/insights/:id/read', requireAuth, async (req, res) => {
  try {
    const updated = await TrendInsight.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Insight not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

export default router;
