import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User not found' });
    const u = req.user.toObject ? req.user.toObject() : req.user;
    const name = u.name || [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(' ').trim() || '';
    const settings = u.settings || {};
    res.json({
      id: u._id,
      name,
      email: u.email,
      timezone: u.timezone ?? 'UTC',
      emailContentSuggestions: settings.emailContentSuggestions ?? false,
      notificationEmail: settings.notificationEmail ?? u.email,
      profileCompletion: u.profileCompletion ?? 0,
      onboardingStep: u.onboardingStep ?? 1,
      profile: u.profile || {},
      settings: u.settings || {},
      aiInstructions: u.aiInstructions || { global: '', useGlobalForAll: true, platforms: {} },
    });
  } catch (err) {
    console.error('Error in /me:', err);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

router.patch('/', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User not found' });
    const { name, timezone, profileCompletion, onboardingStep, profile, settings, aiInstructions, emailContentSuggestions, notificationEmail } = req.body || {};
    if (name !== undefined) req.user.name = String(name).trim();
    if (timezone !== undefined) req.user.timezone = String(timezone) || 'UTC';
    if (profileCompletion !== undefined) req.user.profileCompletion = Math.min(100, Math.max(0, Number(profileCompletion) || 0));
    if (onboardingStep !== undefined && onboardingStep >= 1 && onboardingStep <= 5) req.user.onboardingStep = onboardingStep;
    if (profile && typeof profile === 'object') {
      req.user.profile = { ...(req.user.profile || {}), ...profile };
    }
    if (settings && typeof settings === 'object') {
      req.user.settings = { ...(req.user.settings || {}), ...settings };
    }
    if (emailContentSuggestions !== undefined) req.user.settings = req.user.settings || {};
    if (emailContentSuggestions === true || emailContentSuggestions === false) {
      req.user.settings.emailContentSuggestions = emailContentSuggestions;
    }
    if (notificationEmail !== undefined) {
      req.user.settings = req.user.settings || {};
      req.user.settings.notificationEmail = notificationEmail ? String(notificationEmail).trim() : null;
    }
    if (aiInstructions && typeof aiInstructions === 'object') {
      req.user.aiInstructions = {
        global: aiInstructions.global ?? req.user.aiInstructions?.global ?? '',
        useGlobalForAll: aiInstructions.useGlobalForAll ?? req.user.aiInstructions?.useGlobalForAll ?? true,
        platforms: { ...(req.user.aiInstructions?.platforms || {}), ...(aiInstructions.platforms || {}) },
      };
    }
    await req.user.save();
    const u = req.user.toObject ? req.user.toObject() : req.user;
    res.json({
      id: u._id,
      email: u.email,
      profile: u.profile || {},
      settings: u.settings || {},
      aiInstructions: u.aiInstructions || {},
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
