/** Civil UTC ordering and half-open intervals, not elapsed SI seconds or ephemeris time. */
import type {
  UtcGregorianInstantInput,
  ParsedUtcGregorianInstant,
} from './utc-calendar-contract.mjs';

export type UtcOrder = -1 | 0 | 1;

export interface UtcGregorianIntervalInput {
  readonly start: UtcGregorianInstantInput;
  readonly end: UtcGregorianInstantInput;
}

export interface UtcGregorianInterval {
  readonly start: Readonly<ParsedUtcGregorianInstant>;
  readonly end: Readonly<ParsedUtcGregorianInstant>;
  readonly boundary: 'START_INCLUSIVE_END_EXCLUSIVE';
}

/** Returns -1, 0 or 1 after strict validation of both inputs. */
export declare function compareUtcGregorianInstants(
  left: UtcGregorianInstantInput,
  right: UtcGregorianInstantInput,
): UtcOrder;

/** Throws UtcInputError('INVALID_UTC_INTERVAL') for empty or reversed intervals. */
export declare function createUtcGregorianInterval(
  interval: UtcGregorianIntervalInput,
): Readonly<UtcGregorianInterval>;
