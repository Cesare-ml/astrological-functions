import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import * as packageRoot from 'astrological-functions';
import * as contacts from 'astrological-functions/declination-contacts';
import * as sourced from 'astrological-functions/sourced-declination-contacts';
import * as provider from 'astrological-functions/declination-provider';
import { AstrologyError } from '../src/index.mjs';
import { calculateDeclinationContacts } from '../src/declination-contacts.mjs';
import { calculateSourcedDeclinationContacts } from '../src/sourced-declination-contacts.mjs';
import { calculateDeclinationContactsWithProvider } from '../src/declination-provider-gate.mjs';

const require = createRequire(import.meta.url);
const provenance = Object.freeze({
  providerId: 'VIRGOSTARS_EPHEMERIS',
  engineVersion: 'synthetic', kernelSetId: 'synthetic', timeModelId: 'synthetic',
});
const coordinates = Object.freeze({
  origin: 'EARTH_GEOCENTER', kind: 'EQUATORIAL_DECLINATION',
  frame: 'ICRS', corrections: 'GEOMETRIC',
});

test('private ESM export map preserves root and adds only three explicit, typed subpaths', () => {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(manifest.private, true);
  assert.equal(manifest.type, 'module');
  // Current main already exports independent house, dodecatemoria and lunar
  // modules; adding declination must not discard any of their public subpaths.
  for (const retained of ['.', './de441-natal-slice', './lunar-provider',
    './house-set', './vehlow-houses']) {
    assert.ok(Object.hasOwn(manifest.exports, retained), `Missing retained export: ${retained}`);
  }
  assert.equal(manifest.exports['.'], './src/index.mjs');
  assert.deepEqual(manifest.exports['./declination-contacts'], {
    types: './src/declination-contacts.d.mts', import: './src/declination-contacts.mjs',
  });
  assert.deepEqual(manifest.exports['./sourced-declination-contacts'], {
    types: './src/sourced-declination-contacts.d.mts', import: './src/sourced-declination-contacts.mjs',
  });
  assert.deepEqual(manifest.exports['./declination-provider'], {
    types: './src/declination-provider-gate.d.mts', import: './src/declination-provider-gate.mjs',
  });
  assert.equal(packageRoot.AstrologyError, AstrologyError);
});

test('three public subpaths expose exactly the existing implementation functions', () => {
  assert.deepEqual(Object.keys(contacts), ['calculateDeclinationContacts']);
  assert.deepEqual(Object.keys(sourced), ['calculateSourcedDeclinationContacts']);
  assert.deepEqual(Object.keys(provider), ['calculateDeclinationContactsWithProvider']);
  assert.equal(contacts.calculateDeclinationContacts, calculateDeclinationContacts);
  assert.equal(sourced.calculateSourcedDeclinationContacts, calculateSourcedDeclinationContacts);
  assert.equal(provider.calculateDeclinationContactsWithProvider, calculateDeclinationContactsWithProvider);
});

test('the public pure calculator preserves directed contra-parallel facts', () => {
  const result = contacts.calculateDeclinationContacts({
    direction: 'A_TO_B', sourcePoints: [{ name: 'Sun', declinationDeg: 18 }],
    targetPoints: [{ name: 'Moon', declinationDeg: -18.2 }],
    contactDefinitions: [{ id: 'CONTRA_PARALLEL', maxOrbDeg: 0.5 }],
  });
  assert.equal(result.methodVersion, 'DECLINATION_CONTACTS_V1');
  assert.equal(result.contacts.length, 1);
  assert.equal(result.contacts[0].contactId, 'CONTRA_PARALLEL');
});

test('the sourced public calculator enforces pinned ICRS coordinates', () => {
  const pointContext = { ...coordinates, frameEpochUtc: null };
  const options = {
    direction: 'SKY_TO_NATAL', contactDefinitions: [{ id: 'CONTRA_PARALLEL', maxOrbDeg: 0.5 }],
    sourceSnapshot: {
      snapshotId: 'sky', datetimeUtc: '2026-11-14T12:00:00Z',
      points: [{ name: 'Sun', declinationDeg: 18 }],
      coordinates: pointContext, provenance,
    },
    targetSnapshot: {
      snapshotId: 'natal', datetimeUtc: '2000-01-01T12:00:00Z',
      points: [{ name: 'Moon', declinationDeg: -18.2 }],
      coordinates: pointContext, provenance,
    },
  };
  const result = sourced.calculateSourcedDeclinationContacts(options);
  assert.equal(result.contract, 'SourcedDeclinationContactsResult');
  assert.equal(result.facts.contacts.length, 1);
  assert.equal(result.sourceContext.provenance.engineVersion, 'synthetic');
  assert.throws(() => sourced.calculateSourcedDeclinationContacts({
    ...options, targetSnapshot: { ...options.targetSnapshot,
      coordinates: { ...pointContext, corrections: 'APPARENT' } },
  }), e => e?.code === 'INCOMPATIBLE_DECLINATION_FRAMES');
});

test('the public asynchronous provider gate accepts only a synthetic, pinned provider', async () => {
  const calls = [];
  const result = await provider.calculateDeclinationContactsWithProvider({
    direction: 'A_TO_B',
    source: { snapshotId: 'A', datetimeUtc: '2000-01-01T12:00:00Z', bodyIds: ['Sun'] },
    target: { snapshotId: 'B', datetimeUtc: '2001-01-01T12:00:00Z', bodyIds: ['Moon'] },
    coordinates, expectedProvenance: provenance,
    contactDefinitions: [{ id: 'CONTRA_PARALLEL', maxOrbDeg: 0 }],
    provider: {
      async getGeocentricEquatorialDeclination(request) {
        calls.push(request.bodyId);
        return {
          snapshotId: request.snapshotId, datetimeUtc: request.datetimeUtc,
          bodyId: request.bodyId,
          declinationDeg: request.bodyId === 'Sun' ? 18 : -18,
          coordinates: request.coordinates, provenance: request.expectedProvenance,
        };
      },
    },
  });
  assert.deepEqual(calls, ['Sun', 'Moon']);
  assert.equal(result.facts.contacts.length, 1);
  assert.equal(result.facts.contacts[0].absoluteOrbDeg, 0);
  assert.equal(result.sourceContext.provenance.kernelSetId, 'synthetic');
});

test('public provider import supports the optional AbortSignal desktop path', async () => {
  const controller = new AbortController();
  controller.abort();
  let requests = 0;
  await assert.rejects(provider.calculateDeclinationContactsWithProvider({
    direction: 'SKY_TO_NATAL',
    source: { snapshotId: 'A', datetimeUtc: '2000-01-01T12:00:00Z', bodyIds: ['Sun'] },
    target: { snapshotId: 'B', datetimeUtc: '2001-01-01T12:00:00Z', bodyIds: ['Moon'] },
    coordinates, expectedProvenance: provenance,
    contactDefinitions: [{ id: 'PARALLEL', maxOrbDeg: 0 }],
    signal: controller.signal,
    provider: { async getGeocentricEquatorialDeclination() { requests++; throw Error('unreachable'); } },
  }), e => e?.code === 'DECLINATION_PROVIDER_ABORTED');
  assert.equal(requests, 0);
});

test('CJS require and internal or misspelled subpaths are not exported', async () => {
  for (const path of [
    'astrological-functions/declination-contacts',
    'astrological-functions/sourced-declination-contacts',
    'astrological-functions/declination-provider',
  ]) {
    assert.throws(() => require(path), e => e?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED');
  }
  for (const path of [
    'astrological-functions/src/declination-provider-gate.mjs',
    'astrological-functions/declination-providers',
    'astrological-functions/../src/index.mjs',
  ]) {
    await assert.rejects(import(path), e =>
      e?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED' || e?.code === 'ERR_INVALID_MODULE_SPECIFIER');
  }
});
