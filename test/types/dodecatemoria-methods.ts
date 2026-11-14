import { calculateDodecatemoriaFacts, type DodecatemoriaFacts, type DodecatemoriaMethod } from '../../src/dodecatemoria-methods.mjs';

const method: DodecatemoriaMethod = 'TWELVE_EQUAL_PARTS_V1';
const result: Readonly<DodecatemoriaFacts> = calculateDodecatemoriaFacts({
  longitudeDeg: 11,
  zodiac: 'TROPICAL',
  method,
});
const projected: number = result.projectedLongitudeDeg;
const part: number | null = result.partIndex;
void projected;
void part;

// @ts-expect-error Unsupported method identifiers must not typecheck.
calculateDodecatemoriaFacts({ longitudeDeg: 11, zodiac: 'TROPICAL', method: 'UNVERSIONED' });
// @ts-expect-error Zodiac projection must be explicit.
calculateDodecatemoriaFacts({ longitudeDeg: 11, method: 'PAULUS_13_V1' });
// @ts-expect-error Caller cannot mutate readonly facts.
result.projectedLongitudeDeg = 1;
