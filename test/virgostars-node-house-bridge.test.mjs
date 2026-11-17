import test from 'node:test';
import assert from 'node:assert/strict';
import {AstrologyError, normalize360} from '../src/index.mjs';
import {ASTRO_COM_HOUSE_SYSTEM_IDS} from '../src/astro-com-house-selector.mjs';
import {calculateAstroComHouseFromProvider} from '../src/astro-com-house-provider.mjs';
import {bindVirgoStarsNodeHouseAngles} from '../src/virgostars-node-house-bridge.mjs';

const RAD = Math.PI / 180;
const DEGREES = 180 / Math.PI;
const datetimeUtc = '2000-01-01T12:00:00Z';
const coordinates = Object.freeze({ut1JulianDay: 2451545, ttJulianDay: 2451545.0008,
  latitudeDeg: 40, longitudeDegEast: 12.4964});
const theta = 61.66688244516181;
const epsilon = 23.437859777570328;
const asc = normalize360(Math.atan2(-Math.cos(theta * RAD),
  Math.sin(epsilon * RAD) * Math.tan(coordinates.latitudeDeg * RAD) +
  Math.cos(epsilon * RAD) * Math.sin(theta * RAD)) * DEGREES + 180);
const mc = normalize360(Math.atan2(Math.sin(theta * RAD),
  Math.cos(theta * RAD) * Math.cos(epsilon * RAD)) * DEGREES);

// Shape is copied from the upstream public Node API, not its implementation.
const nativeOutput = Object.freeze({...coordinates,
  model: 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME',
  armcDeg: theta, ascendantDeg: asc, midheavenDeg: mc, trueObliquityDeg: epsilon,
  vertexDeg: 280, eastPointDeg: 100, coAscendantDeg: 45, coAscendantKochDeg: 46,
  polarAscendantDeg: 210});
const fakeAttestation = Object.freeze({upstreamCommitSha: 'a'.repeat(40),
  nativeAddonSha256: 'b'.repeat(64), kernelSetId: 'MOCK_NO_KERNEL'});
const errorCode = code => err => err instanceof AstrologyError && err.code === code;

test('Node binding-shaped source feeds 24 isolated house methods without extra angle fields', async () => {
  const calls = [];
  const nativeProvider = {calculateHouseAngles(input) {
    calls.push(input);
    return {...nativeOutput};
  }};
  const bridge = bindVirgoStarsNodeHouseAngles(nativeProvider, fakeAttestation);
  assert.equal(bridge.attestation.repository, 'Cesare-ml/VirgoStars-Ephemeris');
  assert.equal(bridge.attestation.provenanceStatus,
    'CALLER_ASSERTED_BINARY_IDENTITY_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(bridge.attestation.kernelRole, 'CALLER_CONTEXT_ONLY_HOUSE_ANGLES_DO_NOT_READ_DE441');
  assert.equal(bridge.expectedProvider.engineVersion, `VIRGOSTARS_RUST_NODE@${'a'.repeat(40)}`);
  assert.equal(bridge.expectedProvider.timeModel, 'EXPLICIT_UT1_TT');
  assert.ok(Object.isFrozen(bridge) && Object.isFrozen(bridge.attestation));

  const sun = Object.freeze({datetimeUtc, declinationDeg: 0,
    modelId: 'SYNTHETIC_DECLINATION', bodyId: 'SUN', frame: 'EQUATORIAL_OF_DATE',
    center: 'EARTH', corrections: 'APPARENT', observerType: 'GEOCENTRIC',
    source: bridge.expectedProvider});
  for (const houseSystem of ASTRO_COM_HOUSE_SYSTEM_IDS) {
    const out = await calculateAstroComHouseFromProvider({...coordinates, datetimeUtc,
      birthTimeKnown: true, expectedProvider: bridge.expectedProvider, houseSystem,
      ...(houseSystem === 'SUNSHINE' ? {sun} : {})}, bridge);
    assert.equal(out.houseSystem, houseSystem);
    assert.equal(out.result.houseSystem, houseSystem);
    assert.equal(out.validation, 'CALLER_ASSERTED_PROVIDER_NOT_INDEPENDENTLY_VERIFIED');
    assert.equal(out.angleSource.kernelSetId, 'MOCK_NO_KERNEL');
    assert.equal(Object.hasOwn(out.angleSource, 'vertexDeg'), false);
    assert.equal(houseSystem === 'GAUQUELIN_36' ? out.result.sectorBoundariesDeg.length :
      out.result.cuspsDeg.length, houseSystem === 'GAUQUELIN_36' ? 36 : 12);
  }
  assert.equal(calls.length, 24);
  assert.deepEqual(calls[0], coordinates);
  assert.ok(Object.isFrozen(calls[0]));
});

test('native adapter may be asynchronous and still enforces the expected observer', async () => {
  const bridge = bindVirgoStarsNodeHouseAngles({async calculateHouseAngles(request) {
    return {...nativeOutput, ...request};
  }}, fakeAttestation);
  const angles = await bridge.calculateHouseAngles(coordinates);
  assert.equal(angles.model, nativeOutput.model);
  assert.equal(angles.engineVersion, bridge.expectedProvider.engineVersion);
  assert.deepEqual(Object.keys(angles).filter(key => key.endsWith('Deg')).sort(),
    ['armcDeg', 'ascendantDeg', 'latitudeDeg', 'midheavenDeg', 'trueObliquityDeg'].sort());
  assert.equal(angles.longitudeDegEast, coordinates.longitudeDegEast);
  assert.ok(Object.isFrozen(angles));
});

test('unknown addon provenance is refused instead of silently claimed as Rust-certified', () => {
  const source = {calculateHouseAngles: () => nativeOutput};
  for (const invalid of [undefined, {}, {...fakeAttestation, upstreamCommitSha: 'unknown'},
    {...fakeAttestation, nativeAddonSha256: 'f'.repeat(40)},
    {...fakeAttestation, kernelSetId: ''}, {...fakeAttestation, kernelSetId: '  '},
    {...fakeAttestation, unexpected: 'EXTRA'}]) {
    assert.throws(() => bindVirgoStarsNodeHouseAngles(source, invalid),
      errorCode('INVALID_NODE_HOUSE_BINDING'));
  }
  assert.throws(() => bindVirgoStarsNodeHouseAngles(null, fakeAttestation),
    errorCode('INVALID_NODE_HOUSE_BINDING'));
});

test('incorrect native epochs, observer, frame, model and nonfinite angles fail closed', async () => {
  for (const bad of [{model: 'MEAN_J2000_GEOMETRIC'},
    {ttJulianDay: coordinates.ttJulianDay + 0.01},
    {ut1JulianDay: coordinates.ut1JulianDay + 0.01},
    {latitudeDeg: coordinates.latitudeDeg + 0.01},
    {longitudeDegEast: coordinates.longitudeDegEast + 0.01},
    {armcDeg: NaN}, {ascendantDeg: Infinity}, {midheavenDeg: undefined},
    {trueObliquityDeg: -23.4}]) {
    const bridge = bindVirgoStarsNodeHouseAngles(
      {calculateHouseAngles: () => ({...nativeOutput, ...bad})}, fakeAttestation);
    assert.throws(() => bridge.calculateHouseAngles(coordinates),
      errorCode('INCOMPATIBLE_ANGLE_SOURCE'));
  }
  const bridge = bindVirgoStarsNodeHouseAngles({calculateHouseAngles: () => nativeOutput},
    fakeAttestation);
  assert.throws(() => bridge.calculateHouseAngles({...coordinates, ttJulianDay: NaN}),
    errorCode('INVALID_NODE_HOUSE_BINDING_REQUEST'));
  assert.throws(() => bridge.calculateHouseAngles({...coordinates, latitudeDeg: '40'}),
    errorCode('INVALID_NODE_HOUSE_BINDING_REQUEST'));
});

test('no silent polar fallback is injected by the binding bridge', async () => {
  const polar = {...coordinates, latitudeDeg: 80};
  const bridge = bindVirgoStarsNodeHouseAngles({calculateHouseAngles: input =>
    ({...nativeOutput, ...input})}, fakeAttestation);
  await assert.rejects(calculateAstroComHouseFromProvider({...polar, datetimeUtc,
    birthTimeKnown: true, houseSystem: 'PLACIDUS', expectedProvider: bridge.expectedProvider}, bridge),
  error => error instanceof AstrologyError);
});
