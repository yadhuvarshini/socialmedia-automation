import mongoose from 'mongoose';

const rateLimitSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD UTC
    key: { type: String, required: true }, // 'app' or userId string
    count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

rateLimitSchema.index({ date: 1, key: 1 }, { unique: true });
export const RateLimit = mongoose.model('RateLimit', rateLimitSchema);
