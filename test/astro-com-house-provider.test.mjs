import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError, normalize360 } from '../src/index.mjs';
import { ASTRO_COM_HOUSE_SYSTEM_IDS, calculateAstroComHouseMethod } from '../src/astro-com-house-selector.mjs';
import { calculateAstroComHouseFromProvider } from '../src/astro-com-house-provider.mjs';

const R = Math.PI / 180, D = 180 / Math.PI;
const datetimeUtc = '2000-01-01T12:00:00Z';
const expectedProvider = Object.freeze({engineVersion: 'RUST_ADAPTER_TEST',
  kernelSetId: 'SYNTHETIC_NO_KERNEL', timeModel: 'MOCK_UT1_TT'});
const geometry = {
  ut1JulianDay: 2451545, ttJulianDay: 2451545.0008,
  latitudeDeg: 40, longitudeDegEast: 12.4964,
};
const theta = 61.66688244516181, epsilon = 23.437859777570328;
const asc = normalize360(Math.atan2(-Math.cos(theta * R),
  Math.sin(epsilon * R) * Math.tan(geometry.latitudeDeg * R) +
  Math.cos(epsilon * R) * Math.sin(theta * R)) * D + 180);
const mc = normalize360(Math.atan2(Math.sin(theta * R),
  Math.cos(theta * R) * Math.cos(epsilon * R)) * D);
const angles = Object.freeze({ ...geometry, ...expectedProvider,
  model: 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME',
  armcDeg: theta, ascendantDeg: asc, midheavenDeg: mc, trueObliquityDeg: epsilon,
});
const request = Object.freeze({...geometry, datetimeUtc, birthTimeKnown: true, expectedProvider});
const sun = Object.freeze({datetimeUtc, declinationDeg: 0, modelId: 'SYNTHETIC_DECLINATION',
  bodyId: 'SUN', frame: 'EQUATORIAL_OF_DATE', center: 'EARTH', corrections: 'APPARENT',
  observerType: 'GEOCENTRIC', source: expectedProvider});
const fail = code => error => error instanceof AstrologyError && error.code === code;

test('all 24 methods are called through one pinned provider request; Gauquelin stays 36-sector', async () => {
  const calls = [];
  const provider = { async calculateHouseAngles(input) {
    calls.push(input);
    return {...angles};
  } };
  for (const houseSystem of ASTRO_COM_HOUSE_SYSTEM_IDS) {
    const selected = {...request, houseSystem, ...(houseSystem === 'SUNSHINE' ? {sun} : {})};
    const out = await calculateAstroComHouseFromProvider(selected, provider);
    assert.equal(out.contract, 'AstroComProviderHouseResult');
    assert.equal(out.houseSystem, houseSystem);
    assert.equal(out.result.houseSystem, houseSystem);
    assert.equal(out.datetimeUtc, '2000-01-01T12:00:00.000Z');
    assert.equal(out.angleSource.engineVersion, expectedProvider.engineVersion);
    assert.equal(out.validation, 'CALLER_ASSERTED_PROVIDER_NOT_INDEPENDENTLY_VERIFIED');
    assert.ok(Object.isFrozen(out) && Object.isFrozen(out.angleSource));
    if (houseSystem === 'GAUQUELIN_36') {
      assert.equal(out.result.sectorBoundariesDeg.length, 36);
      assert.equal(Object.hasOwn(out.result, 'cuspsDeg'), false);
    } else {
      assert.equal(out.result.cuspsDeg.length, 12);
    }
  }
  assert.equal(calls.length, 24);
  assert.deepEqual(calls[0], geometry);
});

test('selective provider calculation does not fail because another method is polar-unavailable', async () => {
  const provider = { calculateHouseAngles: () => ({...angles}) };
  const result = await calculateAstroComHouseFromProvider({...request, houseSystem: 'PORPHYRY'}, provider);
  assert.equal(result.result.houseSystem, 'PORPHYRY');
  // Changing method does not silently replace an unavailable computation.
  const polar = {...request, houseSystem: 'PLACIDUS', latitudeDeg: 80};
  const polarAngles = {...angles, latitudeDeg: 80};
  await assert.rejects(calculateAstroComHouseFromProvider(polar,
    {calculateHouseAngles: () => polarAngles}), error => error instanceof AstrologyError);
});

test('provider identity, frame model and observer/epoch must all match exactly', async () => {
  for (const change of [
    {kernelSetId: 'DIFFERENT_KERNEL'}, {timeModel: 'INFERRED_TIME'},
    {engineVersion: 'UNKNOWN_PROVIDER'}, {ut1JulianDay: geometry.ut1JulianDay + 0.01},
    {ttJulianDay: geometry.ttJulianDay + 0.01},
    {longitudeDegEast: geometry.longitudeDegEast + 0.1},
    {latitudeDeg: geometry.latitudeDeg + 1}, {model: 'MEAN_J2000_GEOMETRIC'},
    {trueObliquityDeg: NaN}, {armcDeg: Infinity},
  ]) {
    await assert.rejects(calculateAstroComHouseFromProvider(
      {...request, houseSystem: 'PORPHYRY'},
      {calculateHouseAngles: () => ({...angles, ...change})}),
    fail('INCOMPATIBLE_ANGLE_SOURCE'));
  }
});

test('invalid UTC, missing times, unknown births, unknown systems and Sun policies fail closed', async () => {
  const provider = { calculateHouseAngles: () => angles };
  const invalid = [
    [{...request, houseSystem: 'DEFAULT'}, 'UNSUPPORTED_HOUSE_SYSTEM'],
    [{...request, houseSystem: 'PORPHYRY', birthTimeKnown: false}, 'BIRTH_TIME_REQUIRED'],
    [{...request, houseSystem: 'PORPHYRY', datetimeUtc: '2000-01-01T12:00:00+00:00'}, 'INVALID_UTC'],
    [{...request, houseSystem: 'PORPHYRY', ut1JulianDay: geometry.ut1JulianDay + 1}, 'INCOHERENT_EPOCH'],
    [{...request, houseSystem: 'PORPHYRY', ttJulianDay: NaN}, 'INVALID_HOUSE_PROVIDER_REQUEST'],
    [{...request, houseSystem: 'PORPHYRY', expectedProvider: {...expectedProvider, kernelSetId: ''}}, 'INCOMPATIBLE_ANGLE_SOURCE'],
    [{...request, houseSystem: 'PORPHYRY', sun}, 'INVALID_HOUSE_PROVIDER_REQUEST'],
    [{...request, houseSystem: 'SUNSHINE'}, 'INCOMPATIBLE_SUN_SOURCE'],
    [{...request, houseSystem: 'PORPHYRY', extraneous: 1}, 'INVALID_HOUSE_PROVIDER_REQUEST'],
  ];
  for (const [invalidRequest, code] of invalid) {
    await assert.rejects(calculateAstroComHouseFromProvider(invalidRequest, provider), fail(code));
  }
});

test('Sunshine rejects a solar declination tied to a different kernel or UTC instant', async () => {
  const provider = { calculateHouseAngles: () => angles };
  for (const incorrectSun of [
    {...sun, datetimeUtc: '2000-01-01T12:01:00Z'},
    {...sun, source: {...expectedProvider, kernelSetId: 'DIFFERENT'}},
    {...sun, corrections: 'GEOMETRIC'},
  ]) {
    await assert.rejects(calculateAstroComHouseFromProvider(
      {...request, houseSystem: 'SUNSHINE', sun: incorrectSun}, provider),
    fail('INCOMPATIBLE_SUN_SOURCE'));
  }
});

test('synchronous and asynchronous providers preserve standalone method results', async () => {
  const selected = {...request, houseSystem: 'WHOLE_SIGN'};
  const sync = await calculateAstroComHouseFromProvider(selected,
    {calculateHouseAngles: () => angles});
  const asyncResult = await calculateAstroComHouseFromProvider(selected,
    {calculateHouseAngles: async () => angles});
  assert.deepEqual(sync, asyncResult);
  assert.deepEqual(sync.result, calculateAstroComHouseMethod({houseSystem: 'WHOLE_SIGN',
    input: {datetimeUtc, birthTimeKnown: true, frame: 'ECLIPTIC_OF_DATE',
      longitudeBasis: {type: 'TROPICAL'}, ascendantLongitudeDeg: asc}}));
  class RustBindingAdapter { calculateHouseAngles() { return angles; } }
  const classResult = await calculateAstroComHouseFromProvider(selected, new RustBindingAdapter());
  assert.deepEqual(sync, classResult);
});
