/**
 * Server-side configuration.
 * All tunable values live here — import this wherever needed.
 */
export const config = {
  search: {
    resultsCount: 3,      // how many recipe variants to return per search
    maxTokens: 2500,      // Claude output cap — increase if results truncate
  },
};
