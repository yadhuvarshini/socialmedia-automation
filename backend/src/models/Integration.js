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
      enum: ['linkedin', 'facebook', 'twitter', 'threads'],
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

export const Integration = mongoose.model('Integration', integrationSchema);
