import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    visibility: { type: String, default: 'PUBLIC', enum: ['PUBLIC', 'CONNECTIONS'] },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'failed'],
      default: 'draft',
    },
    scheduledAt: { type: Date },
    publishedAt: { type: Date },
    // Legacy field for backward compatibility
    linkedinPostUrn: { type: String },
    // New multi-platform fields
    platforms: [{ type: String, enum: ['linkedin', 'facebook', 'twitter', 'threads', 'reddit', 'instagram'] }],
    platformIds: { type: Map, of: String }, // Map of platform -> post ID
    platformUrls: { type: Map, of: String }, // Map of platform -> post URL
    errors: [{ platform: String, error: String }],
  },
  { timestamps: true }
);

postSchema.index({ userId: 1, status: 1 });
postSchema.index({ status: 1, scheduledAt: 1 });
export const Post = mongoose.model('Post', postSchema);
