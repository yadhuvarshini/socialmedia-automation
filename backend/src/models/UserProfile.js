import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String },
    websiteUrl: { type: String },
    businessSummary: { type: String },
    brandTone: { type: String },
    keywords: [{ type: String }],
    industry: { type: String },
    aiRefinedSummary: { type: String },
    targetAudience: { type: String },
    valueProposition: { type: String },
    editable: { type: Boolean, default: true },
    lastScrapedAt: { type: Date },
    customScraperApiUrl: { type: String },
  },
  { timestamps: true }
);

userProfileSchema.index({ userId: 1 });
export const UserProfile = mongoose.model('UserProfile', userProfileSchema);
