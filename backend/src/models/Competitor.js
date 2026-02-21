import mongoose from 'mongoose';

const competitorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    competitorName: { type: String, required: true },
    competitorUrl: { type: String, required: true },
    rawScrapedData: { type: mongoose.Schema.Types.Mixed },
    aiAnalysis: {
      ideology: { type: String },
      positioning: { type: String },
      strengths: [{ type: String }],
      differentiators: [{ type: String }],
      sustainabilityModel: { type: String },
      messagingTone: { type: String },
      contentStyle: { type: String },
      keyProducts: [{ type: String }],
      pricingStrategy: { type: String },
      targetAudience: { type: String },
      technicalStack: { type: String },
      socialProof: { type: String },
      strengthsVsYou: { type: String },
      opportunityGap: { type: String },
    },
    lastScrapedAt: { type: Date },
  },
  { timestamps: true }
);

competitorSchema.index({ userId: 1 });
export const Competitor = mongoose.model('Competitor', competitorSchema);
