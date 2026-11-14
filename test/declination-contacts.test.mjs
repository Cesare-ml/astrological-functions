import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDeclinationContacts } from '../src/declination-contacts.mjs';

const base = {
  direction: 'A_TO_B',
  sourcePoints: [{ name: 'Sun', declinationDeg: 18 }],
  targetPoints: [{ name: 'Moon', declinationDeg: 17.5 }],
  contactDefinitions: [
    { id: 'PARALLEL', maxOrbDeg: 0.5 },
    { id: 'CONTRA_PARALLEL', maxOrbDeg: 0.5 },
  ],
};
const calculate = patch => calculateDeclinationContacts({ ...base, ...patch });

function failsWithCode(fn, code) {
  assert.throws(fn, err => err?.name === 'AstrologyError' && err.code === code);
}

test('same-sign parallel matches at exact inclusive orb and keeps the directional identities', () => {
  const out = calculate({});
  assert.equal(out.contract, 'DeclinationContactsResult');
  assert.equal(out.methodVersion, 'DECLINATION_CONTACTS_V1');
  assert.equal(out.contacts.length, 1);
  assert.deepEqual(out.contacts[0], {
    direction: 'A_TO_B', source: { name: 'Sun', declinationDeg: 18 },
    target: { name: 'Moon', declinationDeg: 17.5 }, contactId: 'PARALLEL',
    signedOffsetDeg: 0.5, absoluteOrbDeg: 0.5, configuredMaxOrbDeg: 0.5,
  });
  assert.equal(calculate({ contactDefinitions: [{ id: 'PARALLEL', maxOrbDeg: 0.499 }] }).contacts.length, 0);
});

test('opposite-sign contra-parallel matches; parallel does not', () => {
  const out = calculate({ targetPoints: [{ name: 'Moon', declinationDeg: -18.2 }],
    contactDefinitions: [{ id: 'PARALLEL', maxOrbDeg: 0.3 }, { id: 'CONTRA_PARALLEL', maxOrbDeg: 0.3 }] });
  assert.equal(out.contacts.length, 1);
  assert.equal(out.contacts[0].contactId, 'CONTRA_PARALLEL');
  assert.ok(Math.abs(out.contacts[0].absoluteOrbDeg - 0.2) < 1e-12);
});

test('equator zero is geometrically both contacts; negative zero canonicalizes', () => {
  const out = calculate({ sourcePoints: [{ name: 'Sun', declinationDeg: -0 }],
    targetPoints: [{ name: 'Moon', declinationDeg: 0 }],
    contactDefinitions: [{ id: 'PARALLEL', maxOrbDeg: 0 }, { id: 'CONTRA_PARALLEL', maxOrbDeg: 0 }] });
  assert.deepEqual(out.contacts.map(x => x.contactId), ['PARALLEL', 'CONTRA_PARALLEL']);
  for (const c of out.contacts) {
    assert.ok(!Object.is(c.signedOffsetDeg, -0));
    assert.ok(!Object.is(c.source.declinationDeg, -0));
  }
});

test('directed A_TO_B, B_TO_A and SKY_TO_NATAL preserve source order and signed offset', () => {
  const forward = calculate({});
  const reverse = calculate({ direction: 'B_TO_A',
    sourcePoints: base.targetPoints, targetPoints: base.sourcePoints });
  assert.equal(reverse.contacts[0].direction, 'B_TO_A');
  assert.equal(reverse.contacts[0].source.name, 'Moon');
  assert.equal(reverse.contacts[0].signedOffsetDeg, -forward.contacts[0].signedOffsetDeg);
  assert.equal(calculate({ direction: 'SKY_TO_NATAL' }).contacts[0].direction, 'SKY_TO_NATAL');
});

test('matched facts, definitions and point snapshots are frozen and detached from mutable inputs', () => {
  const sourcePoints = [{ name: 'Sun', declinationDeg: 18 }];
  const contactDefinitions = [{ id: 'PARALLEL', maxOrbDeg: 0.5 }];
  const result = calculate({ sourcePoints, contactDefinitions });
  sourcePoints[0].declinationDeg = 42;
  contactDefinitions[0].maxOrbDeg = 90;
  assert.equal(result.contacts[0].source.declinationDeg, 18);
  assert.equal(result.contactDefinitions[0].maxOrbDeg, 0.5);
  for (const x of [result, result.contacts, result.contacts[0], result.contacts[0].source, result.contactDefinitions, result.contactDefinitions[0]]) {
    assert.equal(Object.isFrozen(x), true);
  }
  assert.throws(() => result.contacts.push('forged'), TypeError);
});

test('stable row order across multiple named sources, targets and configured types', () => {
  const out = calculate({ sourcePoints: [
    { name: 'Sun', declinationDeg: 0 }, { name: 'Mercury', declinationDeg: 0 }],
  targetPoints: [{ name: 'Moon', declinationDeg: 0 }, { name: 'Venus', declinationDeg: 0 }],
  contactDefinitions: [{ id: 'CONTRA_PARALLEL', maxOrbDeg: 0 }, { id: 'PARALLEL', maxOrbDeg: 0 }] });
  assert.deepEqual(out.contacts.map(c => `${c.source.name}-${c.target.name}-${c.contactId}`), [
    'Sun-Moon-CONTRA_PARALLEL', 'Sun-Moon-PARALLEL', 'Sun-Venus-CONTRA_PARALLEL', 'Sun-Venus-PARALLEL',
    'Mercury-Moon-CONTRA_PARALLEL', 'Mercury-Moon-PARALLEL', 'Mercury-Venus-CONTRA_PARALLEL', 'Mercury-Venus-PARALLEL',
  ]);
  assert.deepEqual([out.sourcePointCount, out.targetPointCount], [2, 2]);
});

test('rejects absent options, wrong direction and incorrect point arrays', () => {
  failsWithCode(() => calculateDeclinationContacts(null), 'INVALID_DECLINATION_ARGUMENT');
  failsWithCode(() => calculate({ direction: 'NATAL_TO_SKY' }), 'INVALID_DECLINATION_DIRECTION');
  failsWithCode(() => calculate({ sourcePoints: [] }), 'INVALID_DECLINATION_POINTS');
  failsWithCode(() => calculate({ targetPoints: new Array(33).fill(base.targetPoints[0]) }), 'INVALID_DECLINATION_POINTS');
  failsWithCode(() => calculate({ sourcePoints: {} }), 'INVALID_DECLINATION_POINTS');
});

test('rejects invalid, duplicate, nonfinite and out-of-range declinations', () => {
  for (const bad of [undefined, NaN, Infinity, -Infinity, '12', 90.01, -90.01]) {
    failsWithCode(() => calculate({ sourcePoints: [{ name: 'Sun', declinationDeg: bad }] }), 'INVALID_DECLINATION_POINT');
  }
  failsWithCode(() => calculate({ targetPoints: [{ name: ' ', declinationDeg: 2 }] }), 'INVALID_DECLINATION_POINT');
  failsWithCode(() => calculate({ sourcePoints: [
    { name: 'Sun', declinationDeg: 3 }, { name: 'Sun', declinationDeg: 4 }] }), 'INVALID_DECLINATION_POINT');
});

test('rejects implicit orb, duplicate or unknown contact definitions, and invalid ranges', () => {
  failsWithCode(() => calculate({ contactDefinitions: [] }), 'INVALID_DECLINATION_CONTACT');
  failsWithCode(() => calculate({ contactDefinitions: [{ id: 'PARALLEL' }] }), 'INVALID_DECLINATION_CONTACT');
  failsWithCode(() => calculate({ contactDefinitions: [{ id: 'PARALLEL', maxOrbDeg: NaN }] }), 'INVALID_DECLINATION_CONTACT');
  failsWithCode(() => calculate({ contactDefinitions: [{ id: 'PARALLEL', maxOrbDeg: -0.1 }] }), 'INVALID_DECLINATION_CONTACT');
  failsWithCode(() => calculate({ contactDefinitions: [{ id: 'CONTRA_PARALLEL', maxOrbDeg: 90.1 }] }), 'INVALID_DECLINATION_CONTACT');
  failsWithCode(() => calculate({ contactDefinitions: [{ id: 'SEXTILE', maxOrbDeg: 1 }] }), 'INVALID_DECLINATION_CONTACT');
  failsWithCode(() => calculate({ contactDefinitions: [
    { id: 'PARALLEL', maxOrbDeg: 1 }, { id: 'PARALLEL', maxOrbDeg: 2 }] }), 'INVALID_DECLINATION_CONTACT');
});
