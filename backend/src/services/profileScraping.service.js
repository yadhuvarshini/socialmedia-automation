import axios from 'axios';
import { UserProfile } from '../models/UserProfile.js';
import { User } from '../models/User.js';
import { fetchHtml, extractStructuredContent } from './scraper.service.js';
import { analyzeBrandFromScraped } from './gemini.js';
import * as knowledgeBaseService from './knowledgeBase.service.js';
import { calculateProfileCompletion } from './profileCompletion.service.js';

/**
 * Scrape user's own website, run AI brand analysis, update UserProfile.
 * If customScraperApiUrl is set, call that API instead. Expected: POST { url } → { extractedText }
 */
export async function scrapeAndUpdateProfile(userId, websiteUrl, customScraperApiUrl = null) {
  let extractedText;
  let structured;

  const profile = await UserProfile.findOne({ userId });
  const scraperUrl = customScraperApiUrl || profile?.customScraperApiUrl;

  if (scraperUrl) {
    const { data } = await axios.post(scraperUrl, { url: websiteUrl }, { timeout: 30000 });
    extractedText = data.extractedText || data.text || (typeof data === 'string' ? data : '');
    structured = { extractedText, title: data.title || '', metaDescription: data.metaDescription || '' };
  } else {
    const html = await fetchHtml(websiteUrl);
    structured = extractStructuredContent(html);
    extractedText = structured.extractedText;
  }

  const aiResult = await analyzeBrandFromScraped(extractedText, websiteUrl);
  if (aiResult.error) {
    throw new Error(aiResult.error);
  }

  const updatedProfile = await UserProfile.findOneAndUpdate(
    { userId },
    {
      websiteUrl,
      businessName: aiResult.businessName || undefined,
      businessSummary: aiResult.businessSummary,
      brandTone: aiResult.brandTone,
      keywords: aiResult.keywords || [],
      industry: aiResult.industry,
      targetAudience: aiResult.targetAudience,
      valueProposition: aiResult.valueProposition,
      aiRefinedSummary: aiResult.businessSummary,
      lastScrapedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  await knowledgeBaseService.upsertSelf(userId, websiteUrl, extractedText, structured);

  const user = await User.findById(userId);
  if (user) {
    const completion = await calculateProfileCompletion(user);
    await User.findByIdAndUpdate(userId, { profileCompletion: completion });
  }

  return updatedProfile;
}
