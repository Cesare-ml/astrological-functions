/**
 * Compile-only integration contract: all four opt-in typed ESM subpaths
 * must coexist. No astronomy, disk access, or runtime execution.
 */
import { calculateNatalWithProvider } from 'astrological-functions/ephemeris-provider';
import type { EphemerisProvider, EphemerisRequest } from 'astrological-functions/ephemeris-provider';
import { calculateDodecatemoriaFacts } from 'astrological-functions/dodecatemoria';
import type { DodecatemoriaInput } from 'astrological-functions/dodecatemoria';
import { calculateDodecatemoriaBatchFacts } from 'astrological-functions/dodecatemoria-batch';
import type { DodecatemoriaBatchInput } from 'astrological-functions/dodecatemoria-batch';
import { classifyZodiacDecan } from 'astrological-functions/zodiac-decan-facts';
import type { ZodiacDecanInput } from 'astrological-functions/zodiac-decan-facts';

const single: DodecatemoriaInput = {
  longitudeDeg: 359.99999999999994,
  zodiac: 'TROPICAL',
  method: 'PAULUS_13_V1',
};
const facts = calculateDodecatemoriaFacts(single);
const sign: number = facts.projectedSignIndex;
void sign;

const batchInput: DodecatemoriaBatchInput = {
  points: [{ id: 'Sun', longitudeDeg: single.longitudeDeg }],
  zodiac: single.zodiac,
  method: single.method,
};
const batch = calculateDodecatemoriaBatchFacts(batchInput);
const batchSign: number = batch.points[0]!.facts.sourceSignIndex;
void batchSign;

const decanInput: ZodiacDecanInput = {
  longitudeDeg: single.longitudeDeg,
  zodiac: { type: 'TROPICAL' },
};
const decan = classifyZodiacDecan(decanInput);
const decanNumber: number = decan.decanNumber;
void decanNumber;

const provider: EphemerisProvider = {
  async getGeocentricEcliptic(request) {
    const body: string = request.bodyName;
    void body;
    return {
      longitudeDeg: 359.99999999999994, latitudeDeg: 0,
      metadata: {
        center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
        engineVersion: 'mock', kernelSetId: 'mock', timeModel: 'mock',
      },
    };
  },
};
const chart = calculateNatalWithProvider({
  datetimeUtc: '2026-11-14T12:00:00Z',
  latitudeDeg: 44.8, longitudeDegEast: 11.9,
  bodyNames: ['Sun'], provider,
});
void chart;

// @ts-expect-error Never accept a geometric frame as apparent coordinates.
const geometricFrame: EphemerisRequest = { datetimeUtc: '2026-11-14T12:00:00Z', bodyName: 'Sun', corrections: 'APPARENT', frame: 'J2000' };
void geometricFrame;

// @ts-expect-error The sidereal decan policy requires an explicit ayanamsa.
const badSidereal: ZodiacDecanInput = { longitudeDeg: 15, zodiac: { type: 'SIDEREAL' } };
void badSidereal;

// @ts-expect-error No implicit dodecatemoria method.
const missingMethod: DodecatemoriaInput = { longitudeDeg: 15, zodiac: 'TROPICAL' };
void missingMethod;
