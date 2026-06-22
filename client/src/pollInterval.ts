export const ANIMATION_INTERVAL_MS = 1000;
export const BASE_POLL_INTERVAL_MS = 10_000;
export const MAX_POLL_INTERVAL_MS = 60_000;
export const REQUEST_TIMEOUT_MS = 30_000;

// Chooses the next poll delay from how long the last /septa request took.
export function getNextPollIntervalMs(
  durationMs: number,
  hadError: boolean,
): number {
  if (hadError) return MAX_POLL_INTERVAL_MS;
  if (durationMs >= 10_000) return MAX_POLL_INTERVAL_MS;
  if (durationMs >= 5_000) return 30_000;
  if (durationMs >= 2_000) return 20_000;
  return BASE_POLL_INTERVAL_MS;
}

// Uses the Network Information API when available (mainly Chromium). Returns
// null when the browser offers no hint so callers fall back to measured RTT.
export function getConnectionHintPollIntervalMs(): number | null {
  const conn = navigator.connection;
  if (!conn) return null;
  if (conn.saveData) return MAX_POLL_INTERVAL_MS;

  switch (conn.effectiveType) {
    case "slow-2g":
      return MAX_POLL_INTERVAL_MS;
    case "2g":
      return 45_000;
    case "3g":
      return 20_000;
    default:
      return null;
  }
}

export function resolvePollIntervalMs(
  durationMs: number,
  hadError: boolean,
): number {
  const measured = getNextPollIntervalMs(durationMs, hadError);
  const hint = getConnectionHintPollIntervalMs();
  return hint !== null ? Math.max(measured, hint) : measured;
}

export function getAnimationSteps(pollIntervalMs: number): number {
  return Math.max(1, Math.round(pollIntervalMs / ANIMATION_INTERVAL_MS));
}
