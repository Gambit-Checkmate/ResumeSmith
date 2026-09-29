// Tailoring waits for parallel O*NET calls before OpenAI: 10s + 35s leaves
// headroom for parsing and the JSON response within the 60s route limit.
export const ONET_TIMEOUT_MS = 10_000;
export const OPENAI_REQUEST_OPTIONS = { timeout: 35_000, maxRetries: 0 } as const;

// Output ceilings bound worst-case spend per request; the timeout only bounds
// latency. Reasoning tokens count toward these, so they leave room for a
// medium-effort reasoning pass plus the largest realistic structured answer.
export const MAX_EXTRACT_OUTPUT_TOKENS = 16_000;
// Each CV part is at most 12,000 characters and uses low reasoning effort, so it needs less room.
export const MAX_CV_EXTRACT_OUTPUT_TOKENS = 10_000;
export const MAX_TAILOR_OUTPUT_TOKENS = 8_000;
