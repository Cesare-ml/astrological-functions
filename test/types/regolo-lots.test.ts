import { calculateRegoloKleroi } from 'astrological-functions/regolo-kleroi';
import type { RegoloKlerosId, RegoloLotInput } from 'astrological-functions/regolo-kleroi';
import { calculateRegoloArabicParts, REGOLO_ARABIC_PARTS_CATALOG } from 'astrological-functions/regolo-arabic-parts';
import type { RegoloArabicPartsInput } from 'astrological-functions/regolo-arabic-parts';

declare const chart: RegoloLotInput;
declare const fullChart: RegoloArabicPartsInput;
const kleroi = calculateRegoloKleroi(chart);
const id: RegoloKlerosId = kleroi.kleroi.ANANKE.id;
const longitude: number = kleroi.kleroi.TYCHE.longitudeDeg;
const parts = calculateRegoloArabicParts(fullChart);
const count: number = parts.availableCount;
const status: 'AVAILABLE' | 'UNAVAILABLE_MISSING_INPUT' = parts.entries[0]!.status;
const formula: string = REGOLO_ARABIC_PARTS_CATALOG[0]!.formulaDay;
void [id, longitude, count, status, formula];

// @ts-expect-error The ephemeris/astronomical sect must not be silently guessed.
calculateRegoloKleroi({ ...chart, sect: 'UNKNOWN' });
// @ts-expect-error A caller must explicitly establish birth time.
calculateRegoloKleroi({ ...chart, birthTimeKnown: false });
// @ts-expect-error A mutable list of any arbitrary planet IDs is not the traditional seven.
calculateRegoloKleroi({ ...chart, planetsLongitudeDeg: { PLUTO: 290 } });
