import { User } from '../models/User.js';
import { UserProfile } from '../models/UserProfile.js';
import { Competitor } from '../models/Competitor.js';
import { Integration } from '../models/Integration.js';

/**
 * Calculate profile completion percentage.
 * +10% basic info (name)
 * +20% business details
 * +20% own website scraped
 * +20% competitor added
 * +20% integrations connected
 * +10% timezone selected
 */
export async function calculateProfileCompletion(user) {
  if (!user) return 0;

  let completion = 0;
  const userId = user._id;

  // Basic info: name (user.name or profile.firstName+lastName)
  const hasName =
    (user.name && user.name.trim().length > 0) ||
    (user.profile?.firstName || user.profile?.lastName);
  if (hasName) completion += 10;

  // Business details (UserProfile with businessName/summary)
  const profile = await UserProfile.findOne({ userId });
  if (profile?.businessName || profile?.businessSummary) completion += 20;

  // Own website scraped
  if (profile?.websiteUrl && profile?.lastScrapedAt) completion += 20;

  // Competitor added
  const competitorCount = await Competitor.countDocuments({ userId });
  if (competitorCount > 0) completion += 20;

  // Integrations connected
  const integrationCount = await Integration.countDocuments({ userId });
  if (integrationCount > 0) completion += 20;

  // Timezone selected
  if (user.timezone && user.timezone !== 'UTC') completion += 10;

  return Math.min(100, completion);
}
