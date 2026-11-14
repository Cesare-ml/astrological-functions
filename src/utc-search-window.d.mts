/** Explicit UTC civil-time window for future event-search APIs. No astronomy. */
export type UtcSearchWindowInput = Readonly<{
  startUtc: string;
  endUtc: string;
  maxDurationMs: number;
}>;

export type ValidatedUtcSearchWindow = Readonly<{
  startUtc: string;
  endUtc: string;
  startEpochMs: number;
  endEpochMs: number;
  durationMs: number;
  maxDurationMs: number;
}>;

/** Throws AstrologyError on malformed UTC instants or invalid bounds. */
export declare function validateUtcSearchWindow(
  input: UtcSearchWindowInput,
): ValidatedUtcSearchWindow;
