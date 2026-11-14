import test from 'node:test';
import assert from 'node:assert/strict';
import { validateHouseCuspContext } from '../src/index.mjs';

test('house cusp context rejects malformed top-level options with a typed error', () => {
  for (const input of [null, false, 0, 'invalid', [], 42]) {
    assert.throws(() => validateHouseCuspContext(input),
      error => error?.name === 'AstrologyError' && error.code === 'INVALID_ARGUMENT');
  }
});

test('house cusp context rejects absent chart or cusp set with a typed error', () => {
  for (const input of [undefined, {}, { chart: {} }, { cuspSet: {} }]) {
    assert.throws(() => validateHouseCuspContext(input),
      error => error?.name === 'AstrologyError' && error.code === 'INVALID_ARGUMENT');
  }
});
