/**
 * Compile-only consumer contract check (NodeNext ESM).
 * npx tsc --noEmit --strict --target es2022 --module nodenext
 *   --moduleResolution nodenext test/types/lunar-provider-consumer.mts
 */
import {
  calculateLunarElongationWithProvider,
  type LunarGeocentricProvider,
  type LunarElongationProviderInput,
  type LunarProviderPin,
} from 'astrological-functions/lunar-provider';
import {
  calculateLunarElongationSectors,
  type LunarElongationSectors,
  type LunarLongitudeContext,
  type LunarSectorId,
} from 'astrological-functions/lunar-elongation';

const pin: LunarProviderPin = {
  engineVersion: 'mock-v1',
  kernelSetId: 'synthetic-kernel',
  timeModelId: 'synthetic-time',
};

const provider: LunarGeocentricProvider = {
  async getGeocentricEcliptic(request) {
    const name: 'Sun' | 'Moon' = request.bodyName;
    const kernel: string = request.kernelSetId;
    const timeModel: string = request.timeModelId;
    void [kernel, timeModel];
    return {
      longitudeDeg: name === 'Sun' ? 350 : 80,
      latitudeDeg: 0,
      metadata: {
        bodyName: name,
        datetimeUtc: request.datetimeUtc,
        center: 'EARTH',
        frame: request.frame,
        corrections: request.corrections,
        engineVersion: pin.engineVersion,
        kernelSetId: pin.kernelSetId,
        timeModelId: pin.timeModelId,
      },
    };
  },
};

const input: LunarElongationProviderInput = {
  datetimeUtc: '2026-11-13T12:30:00Z',
  zodiac: 'TROPICAL',
  expectedEphemeris: pin,
  provider,
};

const lunarContext: LunarLongitudeContext = {
  center: 'EARTH',
  frame: 'ECLIPTIC_OF_DATE',
  corrections: 'APPARENT',
  zodiac: 'TROPICAL',
};
const direct: Readonly<LunarElongationSectors> = calculateLunarElongationSectors({
  sunLongitudeDeg: 350,
  moonLongitudeDeg: 80,
  context: lunarContext,
});
const label: LunarSectorId = direct.sectorId;
void label;

async function consume(): Promise<string> {
  const result = await calculateLunarElongationWithProvider(input);
  const longitude: number = result.positions.Moon.longitudeDeg;
  const sector: LunarSectorId = result.sectors.sectorId;
  const version: string = result.ephemeris.engineVersion;
  return [longitude, sector, version].join('|');
}
void consume;

// @ts-expect-error sidereal mode requires a different, validated adapter
const wrongZodiac: LunarElongationProviderInput = { ...input, zodiac: 'SIDEREAL' };
void wrongZodiac;

// @ts-expect-error a pinned time model is mandatory
const missingPin: LunarProviderPin = { engineVersion: 'mock-v1', kernelSetId: 'synthetic' };
void missingPin;

// @ts-expect-error the tropical geometry input cannot carry a sidereal ayanamsa
const wrongContext: LunarLongitudeContext = { ...lunarContext, zodiac: 'TROPICAL', ayanamsaId: 'X' };
void wrongContext;

// @ts-expect-error consumers must not mutate snapshots
direct.sectorId = 'NEW';
