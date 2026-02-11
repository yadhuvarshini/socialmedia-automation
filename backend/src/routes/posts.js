import { Router } from 'express';
import { Post } from '../models/Post.js';
import { Integration } from '../models/Integration.js';
import { requireAuth } from '../middleware/auth.js';
import { canMakeLinkedInCall, incrementLinkedInUsage } from '../services/rateLimit.js';
import { createPost as createLinkedInPost, buildAuthorUrn, getMemberId } from '../services/linkedin.js';
import { createPost as createFacebookPost } from '../services/facebook.js';
import { createPost as createTwitterPost } from '../services/twitter.js';
import { createPost as createThreadsPost } from '../services/threads.js';
import { createPost as createRedditPost, refreshAccessToken as refreshRedditToken } from '../services/reddit.js';
import { createPost as createInstagramPost, createInstagramMediaContainer, publishInstagramMedia, getInstagramPublishingLimit } from '../services/instagram.js';

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

          case 'reddit':
            if (!integration.accessToken || !integration.redditSubreddit) {
              errors.push({ platform: 'reddit', error: 'Reddit credentials or subreddit missing' });
              continue;
            }
            // Check if token is expired and refresh if needed
            if (integration.tokenExpiresAt && integration.tokenExpiresAt < new Date() && integration.redditRefreshToken) {
              const refreshResult = await refreshRedditToken(integration.redditRefreshToken);
              if (refreshResult.error) {
                errors.push({ platform: 'reddit', error: 'Failed to refresh Reddit token: ' + refreshResult.error });
                continue;
              }
              integration.accessToken = refreshResult.access_token;
              integration.tokenExpiresAt = new Date(Date.now() + (refreshResult.expires_in || 3600) * 1000);
              await integration.save();
            }
            if (trimmed.length > 300) {
              // Reddit: use first 300 chars as title, rest as body
              const redditTitle = trimmed.substring(0, 300);
              const redditBody = trimmed.substring(300);
              result = await createRedditPost(
                integration.accessToken,
                integration.redditSubreddit,
                redditTitle,
                redditBody
              );
            } else {
              result = await createRedditPost(
                integration.accessToken,
                integration.redditSubreddit,
                trimmed,
                ''
              );
            }
            integration.lastUsedAt = new Date();
            await integration.save();
            break;

          case 'instagram':
            if (!integration.instagramBusinessAccountId || !integration.instagramPageAccessToken) {
              errors.push({ platform: 'instagram', error: 'Instagram Business Account not configured' });
              continue;
            }
            if (trimmed.length > 2200) {
              errors.push({ platform: 'instagram', error: 'Caption exceeds 2200 characters' });
              continue;
            }
            // Instagram requires an image for feed posts
            // Check if imageUrl is provided in the request body
            const imageUrl = req.body?.imageUrl;
            if (!imageUrl) {
              errors.push({ platform: 'instagram', error: 'Instagram requires an image URL for feed posts' });
              continue;
            }
            result = await createInstagramPost(
              integration.instagramPageAccessToken,
              integration.instagramBusinessAccountId,
              trimmed,
              imageUrl
            );
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

// POST /posts/image - Publish image to Instagram
router.post('/image', async (req, res) => {
  try {
    const { content, imageUrl, platforms } = req.body;
    const userId = req.user._id;

    if (!imageUrl || !platforms || platforms.length === 0) {
      return res.status(400).json({ error: 'imageUrl and platforms are required' });
    }

    // Validate that imageUrl is a proper HTTPS URL (not data URL or localhost)
    if (imageUrl.startsWith('data:') || imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1')) {
      return res.status(400).json({ 
        error: 'Instagram requires publicly accessible HTTPS image URLs. Please upload images to a public server first.' 
      });
    }

    const results = {};

    // Handle Instagram posting
    if (platforms.includes('instagram')) {
      try {
        const integration = await Integration.findOne({ userId, platform: 'instagram' });
        if (!integration) {
          results.instagram = { success: false, error: 'Instagram not connected' };
        } else {
          // Check rate limit
          const limit = await getInstagramPublishingLimit(integration.platformUserId, integration.accessToken);
          if (limit.quota_used >= 100) {
            results.instagram = { success: false, error: 'Rate limit exceeded (100 posts per 24 hours)' };
          } else {
            // Create media container
            const container = await createInstagramMediaContainer(
              integration.platformUserId,
              integration.accessToken,
              {
                image_url: imageUrl,
                caption: content || '',
                media_type: 'IMAGE'
              }
            );

            console.log('Container response:', { container, error: container?.error });
            if (!container || !container.id) {
              results.instagram = { success: false, error: container?.error || 'Failed to create media container' };
            } else {
              // Publish media
              const published = await publishInstagramMedia(
                integration.platformUserId,
                integration.accessToken,
                container.id
              );

              console.log('Publish response:', { published, error: published?.error });
              if (published && published.media_id) {
                // Save to database
                const post = new Post({
                  userId,
                  content,
                  platforms: ['instagram'],
                  imageUrl,
                  platformPostIds: { instagram: published.media_id },
                  status: 'published'
                });
                await post.save();
                results.instagram = { success: true, postId: published.media_id };
              } else {
                results.instagram = { success: false, error: published?.error || 'Failed to publish media' };
              }
            }
          }
        }
      } catch (error) {
        console.error('Instagram image publishing error:', error.message);
        results.instagram = { success: false, error: error.message };
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Image publishing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /posts/video - Publish video to Instagram
router.post('/video', async (req, res) => {
  try {
    const { content, videoUrl, platforms, mediaType } = req.body;
    const userId = req.user._id;

    if (!videoUrl || !platforms || platforms.length === 0) {
      return res.status(400).json({ error: 'videoUrl and platforms are required' });
    }

    const results = {};

    // Handle Instagram posting
    if (platforms.includes('instagram')) {
      try {
        const integration = await Integration.findOne({ userId, platform: 'instagram' });
        if (!integration) {
          results.instagram = { success: false, error: 'Instagram not connected' };
        } else {
          // Check rate limit
          const limit = await getInstagramPublishingLimit(integration.platformUserId, integration.accessToken);
          if (limit.quota_used >= 100) {
            results.instagram = { success: false, error: 'Rate limit exceeded (100 posts per 24 hours)' };
          } else {
            // Determine media type (VIDEO or REELS)
            const instagramMediaType = mediaType || 'VIDEO';

            // Create media container
            const container = await createInstagramMediaContainer(
              integration.platformUserId,
              integration.accessToken,
              {
                video_url: videoUrl,
                caption: content || '',
                media_type: instagramMediaType
              }
            );

            if (!container || !container.id) {
              results.instagram = { success: false, error: 'Failed to create media container' };
            } else {
              // Publish media
              const published = await publishInstagramMedia(
                integration.platformUserId,
                integration.accessToken,
                container.id
              );

              if (published && published.media_id) {
                // Save to database
                const post = new Post({
                  userId,
                  content,
                  platforms: ['instagram'],
                  videoUrl,
                  platformPostIds: { instagram: published.media_id },
                  status: 'published'
                });
                await post.save();
                results.instagram = { success: true, postId: published.media_id };
              } else {
                results.instagram = { success: false, error: 'Failed to publish media' };
              }
            }
          }
        }
      } catch (error) {
        console.error('Instagram video publishing error:', error.message);
        results.instagram = { success: false, error: error.message };
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Video publishing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /posts/carousel - Publish carousel to Instagram
router.post('/carousel', async (req, res) => {
  try {
    const { content, mediaItems, platforms } = req.body;
    const userId = req.user._id;

    if (!mediaItems || !Array.isArray(mediaItems) || mediaItems.length < 2 || !platforms || platforms.length === 0) {
      return res.status(400).json({ error: 'At least 2 mediaItems and platforms are required' });
    }

    const results = {};

    // Handle Instagram posting
    if (platforms.includes('instagram')) {
      try {
        const integration = await Integration.findOne({ userId, platform: 'instagram' });
        if (!integration) {
          results.instagram = { success: false, error: 'Instagram not connected' };
        } else {
          // Check rate limit
          const limit = await getInstagramPublishingLimit(integration.platformUserId, integration.accessToken);
          if (limit.quota_used >= 100) {
            results.instagram = { success: false, error: 'Rate limit exceeded (100 posts per 24 hours)' };
          } else {
            // Create containers for each media item
            const children = [];
            for (const media of mediaItems) {
              const container = await createInstagramMediaContainer(
                integration.platformUserId,
                integration.accessToken,
                {
                  image_url: media.imageUrl,
                  video_url: media.videoUrl,
                  media_type: media.type || 'IMAGE'
                }
              );

              if (container && container.id) {
                children.push(container.id);
              }
            }

            if (children.length === 0) {
              results.instagram = { success: false, error: 'Failed to create media containers' };
            } else {
              // Create carousel container
              const carousel = await createInstagramMediaContainer(
                integration.platformUserId,
                integration.accessToken,
                {
                  media_type: 'CAROUSEL',
                  children: children,
                  caption: content || ''
                }
              );

              if (!carousel || !carousel.id) {
                results.instagram = { success: false, error: 'Failed to create carousel container' };
              } else {
                // Publish carousel
                const published = await publishInstagramMedia(
                  integration.platformUserId,
                  integration.accessToken,
                  carousel.id
                );

                if (published && published.media_id) {
                  // Save to database
                  const post = new Post({
                    userId,
                    content,
                    platforms: ['instagram'],
                    mediaItems,
                    platformPostIds: { instagram: published.media_id },
                    status: 'published'
                  });
                  await post.save();
                  results.instagram = { success: true, postId: published.media_id };
                } else {
                  results.instagram = { success: false, error: 'Failed to publish carousel' };
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Instagram carousel publishing error:', error.message);
        results.instagram = { success: false, error: error.message };
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Carousel publishing error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
