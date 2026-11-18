#!/usr/bin/env node
/**
 * Manual, offline parity against the nine kleroi expressions in the original
 * Regolo `func.js`. The exact Git blob is supplied by the operator, verified,
 * and only the isolated symbolic arithmetic block is evaluated. No Swiss call
 * or original ephemeris/HTTP function is executed. Node VM is not a security
 * sandbox: only pass the pinned, trusted owner source.
 */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createContext, Script } from 'node:vm';
import { calculateRegoloKleroi } from '../src/regolo-kleroi.mjs';

const EXPECTED_SOURCE_BLOB = '536efcd4e6a652448530c6dbd980aee1d72bc3bd';
const PLANETS = Object.freeze(['SUN', 'MOON', 'MERCURY', 'VENUS', 'MARS', 'JUPITER', 'SATURN']);
const NAMES = Object.freeze({
  TYCHE: 'Tyche', DAIMON: 'Daimon', ANANKE: 'Ananke', BASIS: 'Basis',
  EROS: 'Eros', HERMES: 'Hermes', TOLMA: 'Tolma', NIKE: 'Nike', NEMESI: 'Nemesi',
});
const tests = Object.freeze([
  {id: 'synthetic-regolo-001', asc: 350,
    bodies: [10, 80, 100, 130, 160, 200, 260]},
  {id: 'synthetic-regolo-seam', asc: 0,
    bodies: [359.99, 0.01, 29.999, 90, 180, 270, 330]},
  {id: 'synthetic-regolo-sign-boundaries', asc: 29.999,
    bodies: [0, 30, 60, 120, 150, 240, 300]},
]);

function getOriginalArithmetic(source) {
  const begin = source.indexOf('var daimon,tyche,ananke,basis,eros,hermes,tolma,nike,nemesi;');
  const last = source.indexOf("if(nemesi!=undefined) obj.planets['Nemesi']", begin);
  const end = source.indexOf(';', last) + 1;
  if (begin < 0 || last < begin || end <= last) {
    throw new Error('Unexpected original Regolo kleroi source structure');
  }
  return source.slice(begin, end);
}

function legacyNine(source, input, sect) {
  const obj = {planets: Object.fromEntries(PLANETS.map((id, i) => [
    id.charAt(0) + id.slice(1).toLowerCase(), {longitude: input.bodies[i]},
  ]))};
  const context = createContext({
    obj,
    as: input.asc,
    diurno: sect === 'DAY',
    pianeti: [0, 1, 2, 3, 4, 5, 6],
    // Values are only symbolic identity tests for the membership guards.
    // No Swiss package or astronomical function is ever imported or invoked.
    swisseph: {SE_VENUS: 3, SE_MERCURY: 2, SE_MARS: 4, SE_JUPITER: 5, SE_SATURN: 6},
  }, {codeGeneration: {strings: false, wasm: false}});
  new Script(getOriginalArithmetic(source)).runInContext(context, {timeout: 2000});
  return Object.fromEntries(Object.entries(NAMES).map(([id, name]) => {
    const longitude = context.obj.planets[name]?.longitude;
    if (!Number.isFinite(longitude)) throw new Error(`Missing original Regolo ${name}`);
    return [id, longitude];
  }));
}

const circularError = (x, y) => Math.abs(((x - y + 540) % 360) - 180);

export function compareRegoloLegacyKleroi(source, {toleranceDeg = 1e-9} = {}) {
  const bytes = Buffer.isBuffer(source) ? source : Buffer.from(source, 'utf8');
  const hash = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if (hash !== EXPECTED_SOURCE_BLOB) {
    throw new Error(`Unexpected Regolo source blob: expected ${EXPECTED_SOURCE_BLOB}, got ${hash}`);
  }
  const original = bytes.toString('utf8');
  const discrepancies = [];
  let comparisons = 0;
  for (const fixture of tests) {
    for (const sect of ['DAY', 'NIGHT']) {
      const legacy = legacyNine(original, fixture, sect);
      const modern = calculateRegoloKleroi({
        birthTimeKnown: true, sect, zodiac: 'TROPICAL', chartContextId: fixture.id,
        ascendantLongitudeDeg: fixture.asc,
        planetsLongitudeDeg: Object.fromEntries(PLANETS.map((id, i) => [id, fixture.bodies[i]])),
      });
      for (const id of Object.keys(NAMES)) {
        comparisons++;
        const referenceDeg = legacy[id];
        const actualDeg = modern.kleroi[id].longitudeDeg;
        const errorDeg = circularError(actualDeg, referenceDeg);
        if (errorDeg > toleranceDeg) {
          discrepancies.push({caseId: fixture.id, sect, id, referenceDeg, actualDeg, errorDeg});
        }
      }
    }
  }
  return Object.freeze({sourceGitBlob: hash, cases: tests.length * 2, comparisons,
    differences: discrepancies.length, discrepancies: Object.freeze(discrepancies)});
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--source' || !args[1]) {
    throw new Error('Usage: node scripts/compare-regolo-legacy-kleroi.mjs --source <file-or->');
  }
  const bytes = args[1] === '-' ? await readStdin() : await readFile(args[1]);
  const result = compareRegoloLegacyKleroi(bytes);
  console.log(JSON.stringify(result, null, 2));
  if (result.differences > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
