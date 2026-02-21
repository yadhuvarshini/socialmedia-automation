import mongoose from 'mongoose';

const trendInsightSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    keywords: [{ type: String }],
    trendData: { type: mongoose.Schema.Types.Mixed },
    aiSuggestion: {
      postIdea: { type: String },
      strategySuggestion: { type: String },
      alertMessage: { type: String },
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

trendInsightSchema.index({ userId: 1, createdAt: -1 });
export const TrendInsight = mongoose.model('TrendInsight', trendInsightSchema);
