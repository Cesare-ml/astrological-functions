import { validateUtcSearchWindow, type UtcSearchWindowInput, type ValidatedUtcSearchWindow } from '../../src/utc-search-window.mjs';

const input: UtcSearchWindowInput = {
  startUtc: '2026-11-14T00:00:00Z',
  endUtc: '2026-11-15T00:00:00Z',
  maxDurationMs: 86_400_000,
};
const result: ValidatedUtcSearchWindow = validateUtcSearchWindow(input);
const elapsed: number = result.durationMs;
void elapsed;

// @ts-expect-error these input values must be strings, not Date objects.
validateUtcSearchWindow({ ...input, startUtc: new Date() });
// @ts-expect-error maxDurationMs is mandatory, never an implicit default.
validateUtcSearchWindow({ startUtc: input.startUtc, endUtc: input.endUtc });
// @ts-expect-error results are immutable values.
result.durationMs = 0;
