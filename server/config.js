/**
 * Server-side configuration.
 * All tunable values live here — import this wherever needed.
 */
export const config = {
  search: {
    resultsCount: 3,      // how many recipe variants to return per search
    maxTokens: 2500,      // Claude output cap — increase if results truncate
  },

  revenuecat: {
    // Get from: RC Dashboard → Project → Webhooks → Authorization header value
    // Set in server/.env as: REVENUECAT_WEBHOOK_SECRET=your_secret_here
    webhookSecret: process.env.REVENUECAT_WEBHOOK_SECRET ?? '',
  },
};
