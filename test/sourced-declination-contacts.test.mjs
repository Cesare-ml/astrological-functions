import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSourcedDeclinationContacts } from '../src/sourced-declination-contacts.mjs';

const utcA = '2000-02-29T23:59:59.123Z';
const utcB = '2026-11-14T12:06:00Z';
const provenance = {
  providerId: 'VIRGOSTARS_EPHEMERIS',
  engineVersion: 'rust-0.1-dev',
  kernelSetId: 'synthetic-kernel',
  timeModelId: 'synthetic-time-v1',
};
const coordinates = {
  origin: 'EARTH_GEOCENTER', kind: 'EQUATORIAL_DECLINATION',
  frame: 'ICRS', frameEpochUtc: null, corrections: 'GEOMETRIC',
};
const sourceSnapshot = {
  snapshotId: 'chart-a', datetimeUtc: utcA, coordinates, provenance,
  points: [{ name: 'Sun', declinationDeg: 18 }],
};
const targetSnapshot = {
  ...sourceSnapshot, snapshotId: 'chart-b', datetimeUtc: utcB,
  points: [{ name: 'Moon', declinationDeg: -18.2 }],
};
const base = {
  direction: 'A_TO_B', sourceSnapshot, targetSnapshot,
  contactDefinitions: [{ id: 'CONTRA_PARALLEL', maxOrbDeg: 0.5 }],
};
const calculate = patch => calculateSourcedDeclinationContacts({ ...base, ...patch });
function expectCode(fn, code) {
  assert.throws(fn, e => e?.name === 'AstrologyError' && e.code === code);
}
const withSource = patch => ({ ...sourceSnapshot, ...patch });
const withTarget = patch => ({ ...targetSnapshot, ...patch });

test('ICRS permits different UTC instants with identical pinned frame and provenance', () => {
  const out = calculate({});
  assert.equal(out.contract, 'SourcedDeclinationContactsResult');
  assert.equal(out.methodVersion, 'SOURCED_DECLINATION_CONTACTS_V1');
  assert.equal(out.facts.contacts.length, 1);
  assert.equal(out.facts.contacts[0].contactId, 'CONTRA_PARALLEL');
  assert.equal(out.facts.contacts[0].source.name, 'Sun');
  assert.equal(out.targetContext.datetimeUtc, utcB);
  assert.equal(out.sourceContext.provenance.kernelSetId, 'synthetic-kernel');
  assert.ok(Math.abs(out.facts.contacts[0].absoluteOrbDeg - 0.2) < 1e-12);
});

test('same-instant true-equator-of-date declinations may be compared', () => {
  const sameFrame = { ...coordinates, frame: 'TRUE_EQUATOR_OF_DATE', frameEpochUtc: utcA };
  const out = calculate({
    sourceSnapshot: withSource({ coordinates: sameFrame }),
    targetSnapshot: withTarget({ coordinates: sameFrame, datetimeUtc: utcA }),
  });
  assert.equal(out.sourceContext.coordinates.frameEpochUtc, utcA);
  assert.equal(out.facts.contacts.length, 1);
});

test('true-equator-of-date mismatch across instants fails instead of comparing different axes', () => {
  expectCode(() => calculate({
    sourceSnapshot: withSource({ coordinates: { ...coordinates, frame: 'TRUE_EQUATOR_OF_DATE', frameEpochUtc: utcA } }),
    targetSnapshot: withTarget({ coordinates: { ...coordinates, frame: 'TRUE_EQUATOR_OF_DATE', frameEpochUtc: utcB } }),
  }), 'INCOMPATIBLE_DECLINATION_FRAMES');
});

test('mismatched ICRS vs of-date frames are rejected', () => {
  expectCode(() => calculate({
    targetSnapshot: withTarget({ datetimeUtc: utcA,
      coordinates: { ...coordinates, frame: 'TRUE_EQUATOR_OF_DATE', frameEpochUtc: utcA } }),
  }), 'INCOMPATIBLE_DECLINATION_FRAMES');
});

test('mixed APPARENT and GEOMETRIC correction semantics fail closed', () => {
  expectCode(() => calculate({ targetSnapshot: withTarget({
    coordinates: { ...coordinates, corrections: 'APPARENT' },
  }) }), 'INCOMPATIBLE_DECLINATION_FRAMES');
});

test('all pinned provider metadata fields must match exactly', () => {
  for (const field of ['engineVersion', 'kernelSetId', 'timeModelId']) {
    expectCode(() => calculate({ targetSnapshot: withTarget({
      provenance: { ...provenance, [field]: 'other-model' },
    }) }), 'INCONSISTENT_DECLINATION_PROVENANCE');
  }
});

test('missing or empty individual provenance identifiers are rejected', () => {
  for (const field of ['engineVersion', 'kernelSetId', 'timeModelId']) {
    for (const bad of [undefined, '', ' ', null]) {
      expectCode(() => calculate({ sourceSnapshot: withSource({
        provenance: { ...provenance, [field]: bad },
      }) }), 'INVALID_DECLINATION_PROVENANCE');
    }
  }
  expectCode(() => calculate({ sourceSnapshot: withSource({ provenance: null }) }), 'INVALID_DECLINATION_PROVENANCE');
  expectCode(() => calculate({ sourceSnapshot: withSource({
    provenance: { ...provenance, providerId: 'SWISS_EPHEMERIS' },
  }) }), 'INVALID_DECLINATION_PROVENANCE');
});

test('unsupported origin, coordinate kind, frame or correction is rejected', () => {
  for (const patch of [{ origin: 'HELIOCENTER' }, { kind: 'ECLIPTIC_LATITUDE' },
    { frame: 'J2000_ECLIPTIC' }, { corrections: 'UNKNOWN' }]) {
    expectCode(() => calculate({ sourceSnapshot: withSource({
      coordinates: { ...coordinates, ...patch },
    }) }), 'INVALID_DECLINATION_FRAME');
  }
  expectCode(() => calculate({ sourceSnapshot: withSource({ coordinates: null }) }), 'INVALID_DECLINATION_FRAME');
});

test('ICRS requires explicit null frame epoch; true-of-date requires own UTC epoch', () => {
  for (const frameEpochUtc of [undefined, utcA, '', 0]) {
    expectCode(() => calculate({ sourceSnapshot: withSource({
      coordinates: { ...coordinates, frameEpochUtc },
    }) }), 'INVALID_DECLINATION_FRAME');
  }
  expectCode(() => calculate({ sourceSnapshot: withSource({
    coordinates: { ...coordinates, frame: 'TRUE_EQUATOR_OF_DATE', frameEpochUtc: utcB },
  }) }), 'INVALID_DECLINATION_FRAME');
  expectCode(() => calculate({ sourceSnapshot: withSource({
    coordinates: { ...coordinates, frame: 'TRUE_EQUATOR_OF_DATE', frameEpochUtc: null },
  }) }), 'INVALID_DECLINATION_FRAME');
});

test('UTC validation rejects calendar rollovers, offsets, leap seconds and 24:00', () => {
  for (const bad of ['2001-02-29T00:00:00Z', '2026-04-31T00:00:00Z',
    '2026-13-14T00:00:00Z', '0000-01-01T00:00:00Z',
    '2026-11-14T24:00:00Z', '2026-11-14T12:60:00Z',
    '2026-11-14T12:06:60Z', '2026-11-14T12:06:00+00:00',
    '2026-11-14T12:06:00.1234567890Z', '2026-11-14']) {
    expectCode(() => calculate({ sourceSnapshot: withSource({ datetimeUtc: bad }) }), 'INVALID_DECLINATION_UTC');
  }
  assert.equal(calculate({ sourceSnapshot: withSource({ datetimeUtc: '2000-02-29T23:59:59.123456789Z' }) }).facts.contacts.length, 1);
});

test('invalid context, blank IDs and absent snapshot fail closed', () => {
  expectCode(() => calculateSourcedDeclinationContacts(null), 'INVALID_DECLINATION_ARGUMENT');
  expectCode(() => calculate({ sourceSnapshot: null }), 'INVALID_DECLINATION_SNAPSHOT');
  expectCode(() => calculate({ targetSnapshot: withTarget({ snapshotId: ' ' }) }), 'INVALID_DECLINATION_SNAPSHOT');
});

test('the underlying geometry and direction validation are delegated without recalculation', () => {
  expectCode(() => calculate({ direction: 'NATAL_TO_SKY' }), 'INVALID_DECLINATION_DIRECTION');
  expectCode(() => calculate({ sourceSnapshot: withSource({
    points: [{ name: 'Sun', declinationDeg: 91 }],
  }) }), 'INVALID_DECLINATION_POINT');
  expectCode(() => calculate({ contactDefinitions: [{ id: 'PARALLEL' }] }), 'INVALID_DECLINATION_CONTACT');
  assert.equal(calculate({ direction: 'SKY_TO_NATAL' }).facts.direction, 'SKY_TO_NATAL');
});

test('provenance and contact snapshots do not change if caller mutates input', () => {
  const source = {
    ...sourceSnapshot, provenance: { ...provenance },
    coordinates: { ...coordinates }, points: [{ name: 'Sun', declinationDeg: 18 }],
  };
  const out = calculate({ sourceSnapshot: source });
  source.provenance.engineVersion = 'mutated';
  source.coordinates.frame = 'TRUE_EQUATOR_OF_DATE';
  source.points[0].declinationDeg = 50;
  assert.equal(out.sourceContext.provenance.engineVersion, 'rust-0.1-dev');
  assert.equal(out.sourceContext.coordinates.frame, 'ICRS');
  assert.equal(out.facts.contacts[0].source.declinationDeg, 18);
  for (const object of [out, out.sourceContext, out.sourceContext.provenance,
    out.sourceContext.coordinates, out.targetContext, out.facts, out.facts.contacts]) {
    assert.equal(Object.isFrozen(object), true);
  }
});

test('sourced context reads metadata getters once without changing returned provenance', () => {
  const source = withSource({
    coordinates: {...coordinates},
    provenance: {...provenance},
  });
  const target = withTarget({});
  let engineReads = 0, frameReads = 0;
  Object.defineProperty(source.provenance, 'engineVersion', {get() {
    engineReads++; return engineReads === 1 ? 'rust-0.1-dev' : 'corrupted';
  }});
  Object.defineProperty(source.coordinates, 'frame', {get() {
    frameReads++; return frameReads === 1 ? 'ICRS' : 'TRUE_EQUATOR_OF_DATE';
  }});
  const result = calculateSourcedDeclinationContacts({
    direction:'A_TO_B', sourceSnapshot:source, targetSnapshot:target,
    contactDefinitions:[{id:'CONTRA_PARALLEL',maxOrbDeg:1}],
  });
  assert.equal(engineReads,1);
  assert.equal(frameReads,1);
  assert.equal(result.sourceContext.provenance.engineVersion,'rust-0.1-dev');
  assert.equal(result.sourceContext.coordinates.frame,'ICRS');
});
