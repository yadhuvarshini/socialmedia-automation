import mongoose from 'mongoose';

const knowledgeBaseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['self', 'competitor'], required: true },
    sourceUrl: { type: String },
    extractedText: { type: String },
    structuredData: { type: mongoose.Schema.Types.Mixed },
    // embeddings: for future vector search
  },
  { timestamps: true }
);

knowledgeBaseSchema.index({ userId: 1, type: 1 });
export const KnowledgeBase = mongoose.model('KnowledgeBase', knowledgeBaseSchema);
