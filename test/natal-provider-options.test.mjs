import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider, AstrologyError } from '../src/index.mjs';

test('malformed natal provider options reject with typed INVALID_ARGUMENT', async () => {
  for (const input of [undefined, null, false, 0, 'invalid', [], 42]) {
    await assert.rejects(calculateNatalWithProvider(input),
      error => error instanceof AstrologyError && error.code === 'INVALID_ARGUMENT');
  }
});

test('missing natal fields retain explicit UTC validation', async () => {
  await assert.rejects(calculateNatalWithProvider({}),
    error => error instanceof AstrologyError && error.code === 'INVALID_UTC');
});
