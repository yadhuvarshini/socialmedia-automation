import { Competitor } from '../models/Competitor.js';
import { UserProfile } from '../models/UserProfile.js';
import { fetchHtml, extractStructuredContent } from './scraper.service.js';
import { analyzeCompetitorFromScraped } from './gemini.js';
import * as knowledgeBaseService from './knowledgeBase.service.js';

/**
 * Scrape competitor URL, run AI analysis, store in DB
 */
export async function scrapeAndAnalyzeCompetitor(userId, competitorName, competitorUrl) {
  const html = await fetchHtml(competitorUrl);
  const structured = extractStructuredContent(html);

  // Get user's business context for "vs you" comparison
  const userProfile = await UserProfile.findOne({ userId });
  const userContext = userProfile?.businessSummary
    ? `Summary: ${userProfile.businessSummary}. Industry: ${userProfile.industry || 'unknown'}.`
    : '';

  const aiAnalysis = await analyzeCompetitorFromScraped(
    structured.extractedText,
    competitorName,
    competitorUrl,
    userContext
  );

  if (aiAnalysis.error) {
    throw new Error(aiAnalysis.error);
  }

  // Upsert competitor
  const competitor = await Competitor.findOneAndUpdate(
    { userId, competitorUrl },
    {
      competitorName,
      competitorUrl,
      rawScrapedData: structured,
      aiAnalysis,
      lastScrapedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  // Store in knowledge base
  await knowledgeBaseService.upsertCompetitor(userId, competitorUrl, structured.extractedText, structured);

  return competitor;
}
