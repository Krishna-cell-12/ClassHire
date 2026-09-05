import { getActiveProvider, LlmCallResult } from './nlSearch.providers';

export type { LlmCallResult } from './nlSearch.providers';

/**
 * Public contract this module exposes to nlSearch.service.ts -- unchanged since Phase 3.
 * Delegates to whichever provider LLM_PROVIDER selects (nlSearch.providers.ts); the caller
 * has no idea which one ran, and doesn't need to. Still does NOT parse or validate -- that
 * happens entirely in nlSearch.service.ts, against the whitelist schema, regardless of
 * provider.
 */
export function callLlmForFilter(query: string): Promise<LlmCallResult> {
  return getActiveProvider().translateToFilter(query);
}
