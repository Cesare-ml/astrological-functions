import test from 'node:test';
import assert from 'node:assert/strict';
import { validateHouseCuspContext } from '../src/index.mjs';

// These values are synthetic; Rust VirgoStars Ephemeris owns astronomy.
const context = Object.freeze({
  datetimeUtc: '2026-11-14T00:00:00Z',
  latitudeDeg: 45, longitudeDegEast: 11,
});
const provenance = Object.freeze({
  engineVersion: 'engine', kernelSetId: 'kernel-A', timeModel: 'time',
});

function chart(override = {}) {
  return { ...context, ephemerisProvenance: { ...provenance }, ...override };
}
function cuspSet(override = {}) {
  return {
    houseSystem: 'PLACIDUS', calculationProfile: 'CANONICAL_V1',
    cusps: Array.from({ length: 12 }, (_, index) => index * 30),
    metadata: { houseSystem: 'PLACIDUS', placementMethod: 'CUSP_INTERVAL',
      ...context, ephemerisProvenance: { ...provenance } },
    ...override,
  };
}

test('chart provenance getter is read once, with validated value published unchanged', () => {
  for (const key of Object.keys(provenance)) {
    let reads = 0;
    const changing = {
      ...provenance,
      get [key]() { return ++reads === 1 ? provenance[key] : 'different'; },
    };
    const result = validateHouseCuspContext({
      chart: chart({ ephemerisProvenance: changing }), cuspSet: cuspSet(),
    });
    assert.equal(reads, 1, key);
    assert.equal(result.metadata.ephemerisProvenance[key], provenance[key], key);
    assert.equal(Object.isFrozen(result.metadata.ephemerisProvenance), true);
  }
});

test('cusp provenance getter is read once during context validation', () => {
  for (const key of Object.keys(provenance)) {
    let reads = 0;
    const changing = {
      ...provenance,
      get [key]() { return ++reads === 1 ? provenance[key] : 'different'; },
    };
    const set = cuspSet();
    set.metadata.ephemerisProvenance = changing;
    const result = validateHouseCuspContext({ chart: chart(), cuspSet: set });
    assert.equal(reads, 1, key);
    assert.equal(result.metadata.ephemerisProvenance[key], provenance[key], key);
  }
});

test('metadata and provenance references are acquired only once', () => {
  let metadataReads = 0;
  let chartReads = 0;
  const valid = cuspSet().metadata;
  const set = cuspSet();
  Object.defineProperty(set, 'metadata', {
    enumerable: true,
    get() {
      return ++metadataReads === 1 ? valid :
        { ...valid, houseSystem: 'VEHLOW' };
    },
  });
  const incoming = chart();
  Object.defineProperty(incoming, 'ephemerisProvenance', {
    enumerable: true,
    get() {
      return ++chartReads === 1 ? provenance :
        { ...provenance, kernelSetId: 'changed' };
    },
  });
  const result = validateHouseCuspContext({ chart: incoming, cuspSet: set });
  assert.equal(metadataReads, 1);
  assert.equal(chartReads, 1);
  assert.equal(result.houseSystem, 'PLACIDUS');
  assert.deepEqual(result.metadata.ephemerisProvenance, provenance);
});

test('cusp system and array getters are used once for validation and output', () => {
  let systemReads = 0;
  let cuspReads = 0;
  const regular = cuspSet();
  const set = cuspSet();
  Object.defineProperty(set, 'houseSystem', {
    enumerable: true,
    get() { return ++systemReads === 1 ? 'PLACIDUS' : 'VEHLOW'; },
  });
  Object.defineProperty(set, 'cusps', {
    enumerable: true,
    get() { return ++cuspReads === 1 ? regular.cusps : Array(12).fill(0); },
  });
  const result = validateHouseCuspContext({ chart: chart(), cuspSet: set });
  assert.equal(systemReads, 1);
  assert.equal(cuspReads, 1);
  assert.equal(result.houseSystem, 'PLACIDUS');
  assert.equal(result.cusps[1], 30);
  assert.equal(Object.isFrozen(result.cusps), true);
});

test('an invalid first provenance read fails closed despite a later valid value', () => {
  let reads = 0;
  const bad = {
    ...provenance,
    get kernelSetId() { return ++reads === 1 ? 'untrusted-kernel' : provenance.kernelSetId; },
  };
  assert.throws(() => validateHouseCuspContext({
    chart: chart({ ephemerisProvenance: bad }), cuspSet: cuspSet(),
  }), { code: 'INCOMPATIBLE_HOUSE_CONTEXT' });
  assert.equal(reads, 1);
});

test('an inherited-only provenance is not accepted as complete metadata', () => {
  assert.throws(() => validateHouseCuspContext({
    chart: chart({ ephemerisProvenance: Object.create(provenance) }),
    cuspSet: cuspSet(),
  }), { code: 'INVALID_HOUSE_METADATA' });
});
