import mongoose from 'mongoose';

const generatedImageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    prompt: { type: String, required: true },
    url: { type: String, required: true },
  },
  { timestamps: true }
);

generatedImageSchema.index({ userId: 1, createdAt: -1 });
export const GeneratedImage = mongoose.model('GeneratedImage', generatedImageSchema);
