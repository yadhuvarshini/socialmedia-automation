import { KnowledgeBase } from '../models/KnowledgeBase.js';

export async function upsertSelf(userId, sourceUrl, extractedText, structuredData = null) {
  await KnowledgeBase.findOneAndUpdate(
    { userId, type: 'self', sourceUrl },
    { extractedText, structuredData },
    { upsert: true, new: true }
  );
}

export async function upsertCompetitor(userId, sourceUrl, extractedText, structuredData = null) {
  await KnowledgeBase.findOneAndUpdate(
    { userId, type: 'competitor', sourceUrl },
    { extractedText, structuredData },
    { upsert: true, new: true }
  );
}

export async function getSelf(userId) {
  return KnowledgeBase.findOne({ userId, type: 'self' });
}

export async function getCompetitors(userId) {
  return KnowledgeBase.find({ userId, type: 'competitor' });
}
