import cron from 'node-cron';
import { Post } from './models/Post.js';
import { canMakeLinkedInCall, incrementLinkedInUsage } from './services/rateLimit.js';
import { createPost, buildAuthorUrn } from './services/linkedin.js';
import { User } from './models/User.js';

async function processScheduledPosts() {
  const now = new Date();
  const due = await Post.find({
    status: 'scheduled',
    scheduledAt: { $lte: now },
  })
    .populate('userId')
    .limit(10)
    .exec();
  for (const post of due) {
    const user = post.userId;
    if (!user || !user.accessToken) {
      await Post.updateOne(
        { _id: post._id },
        { status: 'failed', error: 'User or token missing' }
      );
      continue;
    }
    if (!user.linkedinId) {
      await Post.updateOne(
        { _id: post._id },
        { status: 'failed', error: 'User needs to re-sign in with LinkedIn' }
      );
      continue;
    }
    const allowed = await canMakeLinkedInCall(user._id);
    if (!allowed) {
      await Post.updateOne(
        { _id: post._id },
        { status: 'failed', error: 'Daily rate limit reached' }
      );
      continue;
    }
    const authorUrn = buildAuthorUrn(user.linkedinId);
    const result = await createPost(user.accessToken, {
      author: authorUrn,
      commentary: post.content,
      visibility: post.visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC',
    });
    if (result.error) {
      await Post.updateOne(
        { _id: post._id },
        { status: 'failed', error: result.error }
      );
      continue;
    }
    await incrementLinkedInUsage(user._id);
    await Post.updateOne(
      { _id: post._id },
      {
        status: 'published',
        publishedAt: new Date(),
        linkedinPostUrn: result.postUrn,
      }
    );
  }
}

export function startScheduler() {
  cron.schedule('* * * * *', processScheduledPosts);
  console.log('Scheduler: running every minute');
}
