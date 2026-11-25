import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './helpers.mjs';
import { buildManifest } from '../tools/build-precache.mjs';

test('precache-manifest.js está al día (ejecuta `npm run precache` si falla)', () => {
  const current = readFileSync(path.join(root, 'precache-manifest.js'), 'utf8');
  assert.equal(current, buildManifest());
});
