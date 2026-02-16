import mongoose from 'mongoose';

const integrationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    platform: {
      type: String,
      required: true,
      enum: ['linkedin', 'facebook', 'twitter', 'threads', 'reddit', 'instagram'],
      index: true,
    },
    // Platform-specific IDs
    platformUserId: { type: String },
    platformUsername: { type: String },

    // OAuth tokens
    accessToken: { type: String, required: true },
    accessTokenSecret: { type: String }, // For Twitter OAuth 1.0a
    refreshToken: { type: String },
    tokenExpiresAt: { type: Date },

    // Facebook-specific
    facebookPageId: { type: String },
    facebookPageAccessToken: { type: String },
    facebookPageName: { type: String },

    // Reddit-specific
    redditRefreshToken: { type: String },
    redditSubreddit: { type: String },

    // Instagram-specific
    instagramBusinessAccountId: { type: String },
    instagramPageId: { type: String },
    instagramPageAccessToken: { type: String },

    // Platform profile info
    profile: {
      name: String,
      username: String,
      profilePicture: String,
      email: String,
    },

    // Status
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

// Compound index to ensure one integration per platform per user
integrationSchema.index({ userId: 1, platform: 1 }, { unique: true });

// Virtual field to map _id to id for frontend compatibility
integrationSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Ensure virtuals are included when converting to JSON
integrationSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const Integration = mongoose.model('Integration', integrationSchema);
