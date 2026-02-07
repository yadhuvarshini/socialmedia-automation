import { Router } from 'express';
import { Post } from '../models/Post.js';
import { Integration } from '../models/Integration.js';
import { requireAuth } from '../middleware/auth.js';
import { canMakeLinkedInCall, incrementLinkedInUsage } from '../services/rateLimit.js';
import { createPost as createLinkedInPost, buildAuthorUrn, getMemberId } from '../services/linkedin.js';
import { createPost as createFacebookPost } from '../services/facebook.js';
import { createPost as createTwitterPost } from '../services/twitter.js';
import { createPost as createThreadsPost } from '../services/threads.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const posts = await Post.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .lean();
  res.json(posts);
});

// explain this , text body of the post
/* text body of the post is the content of the post */
// explain where is pauload request generates, 
/* payload request generates in the createPost function */
/* createPost function is in the linkedin.js file */
/* createPost function is used to create a post on LinkedIn */
/* createPost function is used to create a post on LinkedIn */
/*
{
  "content": "Hello World! This is my first Share on LinkedIn!",
  "scheduleAt": "2026-02-01T10:00:00.000Z",
  "visibility": "PUBLIC"
}
*/

router.post('/', async (req, res) => {
  const { content, scheduleAt, visibility = 'PUBLIC', platforms = [] } = req.body || {};
  console.log(req.body);
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content is required' });
  }
  const trimmed = content.trim();
  if (!trimmed) return res.status(400).json({ error: 'content cannot be empty' });

  const postNow = !scheduleAt;
  if (postNow) {
    // Get active integrations
    const integrations = await Integration.find({
      userId: req.user._id,
      isActive: true,
      platform: platforms.length > 0 ? { $in: platforms } : { $exists: true },
    });

    if (integrations.length === 0) {
      return res.status(400).json({
        error: 'No active integrations found. Please connect at least one platform.',
      });
    }

    const results = [];
    const errors = [];

    // Post to each integration
    for (const integration of integrations) {
      try {
        let result;

        switch (integration.platform) {
          case 'linkedin':
            const allowed = await canMakeLinkedInCall(req.user._id);
            if (!allowed) {
              errors.push({ platform: 'linkedin', error: 'Daily LinkedIn post limit reached' });
              continue;
            }
            const authorUrn = buildAuthorUrn(integration.platformUserId);
            if (!authorUrn) {
              errors.push({ platform: 'linkedin', error: 'Invalid LinkedIn account' });
              continue;
            }
            const payload = {
              author: authorUrn,
              commentary: trimmed,
              visibility: visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC',
            };
            result = await createLinkedInPost(integration.accessToken, payload);
            if (!result.error) {
              await incrementLinkedInUsage(req.user._id);
            }
            break;

          case 'facebook':
            if (!integration.facebookPageId || !integration.facebookPageAccessToken) {
              errors.push({ platform: 'facebook', error: 'No Facebook page selected' });
              continue;
            }
            result = await createFacebookPost(
              integration.facebookPageAccessToken,
              integration.facebookPageId,
              trimmed
            );
            break;

          case 'twitter':
            if (!integration.accessToken || !integration.accessTokenSecret) {
              errors.push({ platform: 'twitter', error: 'Twitter credentials missing' });
              continue;
            }
            if (trimmed.length > 280) {
              errors.push({ platform: 'twitter', error: 'Post exceeds 280 characters' });
              continue;
            }
            result = await createTwitterPost(
              integration.accessToken,
              integration.accessTokenSecret,
              trimmed
            );
            break;

          case 'threads':
            if (!integration.accessToken || !integration.platformUserId) {
              errors.push({ platform: 'threads', error: 'Threads credentials missing' });
              continue;
            }
            if (trimmed.length > 500) {
              errors.push({ platform: 'threads', error: 'Post exceeds 500 characters' });
              continue;
            }
            result = await createThreadsPost(
              integration.accessToken,
              integration.platformUserId,
              trimmed
            );
            // Update last used
            integration.lastUsedAt = new Date();
            await integration.save();
            break;

          default:
            errors.push({ platform: integration.platform, error: 'Unsupported platform' });
            continue;
        }

        if (result.error) {
          errors.push({ platform: integration.platform, error: result.error });
        } else {
          results.push({
            platform: integration.platform,
            id: result.id,
            url: result.url,
          });
        }
      } catch (err) {
        errors.push({ platform: integration.platform, error: err.message });
      }
    }

    if (results.length === 0) {
      return res.status(400).json({
        error: 'Failed to post to any platform',
        errors,
      });
    }

    // Create post record
    const post = await Post.create({
      userId: req.user._id,
      content: trimmed,
      visibility,
      status: 'published',
      publishedAt: new Date(),
      platforms: results.map(r => r.platform),
      platformIds: results.reduce((acc, r) => ({ ...acc, [r.platform]: r.id }), {}),
      platformUrls: results.reduce((acc, r) => ({ ...acc, [r.platform]: r.url }), {}),
    });

    const postObj = post.toObject();
    postObj.results = results;
    if (errors.length > 0) {
      postObj.errors = errors;
    }

    return res.status(201).json(postObj);
  }



  const scheduledAt = new Date(scheduleAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    return res.status(400).json({ error: 'Invalid scheduleAt date' });
  }
  if (scheduledAt <= new Date()) {
    return res.status(400).json({ error: 'scheduleAt must be in the future' });
  }
  const post = await Post.create({
    userId: req.user._id,
    content: trimmed,
    visibility,
    status: 'scheduled',
    scheduledAt,
  });
  res.status(201).json(post);
});

router.patch('/:id', async (req, res) => {
  const post = await Post.findOne({ _id: req.params.id, userId: req.user._id });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.status !== 'draft' && post.status !== 'scheduled') {
    return res.status(400).json({ error: 'Only draft or scheduled posts can be updated' });
  }
  const { content, scheduleAt, visibility } = req.body || {};
  if (content !== undefined) post.content = String(content).trim();
  if (visibility !== undefined) post.visibility = visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC';
  if (scheduleAt !== undefined) {
    const d = new Date(scheduleAt);
    if (!Number.isNaN(d.getTime())) post.scheduledAt = d;
  }
  await post.save();
  res.json(post);
});

router.delete('/:id', async (req, res) => {
  const post = await Post.findOne({ _id: req.params.id, userId: req.user._id });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  await Post.deleteOne({ _id: post._id });
  res.json({ ok: true });
});

export default router;
