#!/usr/bin/env node
/**
 * Manual, offline parity of Regolo's *original* Arabic-part arithmetic.
 * The legacy file is supplied by the operator and checked against its pinned
 * Git blob SHA before any evaluation. Nothing from Regolo is vendored here.
 * Only the pure functions before the HTTP router are evaluated in a restricted
 * context; Express, Swiss Ephemeris, moment and the original API never load.
 * A Node VM is not a security sandbox: supply only the verified owner file.
 */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Script, createContext } from 'node:vm';
import { calculateRegoloArabicParts, REGOLO_ARABIC_PARTS_CATALOG } from '../src/regolo-arabic-parts.mjs';

const EXPECTED_BLOB = '51c5ae87451a1718212153e77139920a12a1f871';
const RULERS = Object.freeze([
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter',
]);
const NAMES = Object.freeze({
  SUN: 'Sun', MOON: 'Moon', MERCURY: 'Mercury', VENUS: 'Venus',
  MARS: 'Mars', JUPITER: 'Jupiter', SATURN: 'Saturn',
});
const normalize = n => ((n % 360) + 360) % 360;
const circularResidual = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

const cases = Object.freeze([
  Object.freeze({
    id: 'synthetic-regolo-001', asc: 350, mc: 300, ds: 170, newMoon: 245,
    planets: [10, 80, 100, 130, 160, 200, 260],
    cusps: Array.from({length: 12}, (_, i) => i * 30 + 10),
  }),
  Object.freeze({
    id: 'synthetic-regolo-wrap', asc: 0, mc: 359.99, ds: 180, newMoon: 0,
    planets: [359.99, 0.01, 29.999, 90, 180, 270, 330],
    cusps: Array.from({length: 12}, (_, i) => normalize(350 + i * 30)),
  }),
  Object.freeze({
    id: 'synthetic-regolo-ruler-boundaries', asc: 29.999, mc: 180, ds: 209.999,
    newMoon: 30, planets: [0, 30, 60, 120, 150, 240, 300],
    cusps: Array.from({length: 12}, (_, i) => normalize(29.999 + i * 30)),
  }),
]);

function sourceMathFunctions(source) {
  const begin = source.indexOf('function initParte(');
  const end = source.indexOf("\nrouter.get('/',", begin);
  if (begin < 0 || end <= begin) throw new Error('Unexpected original Regolo source structure');
  return source.slice(begin, end);
}

function extractLegacyRows(source, fixture, sect) {
  const planets = Object.fromEntries(Object.entries(NAMES)
    .map(([id, name], i) => [name, {longitude: fixture.planets[i]}]));
  const day = sect === 'DAY';
  const sun = planets.Sun.longitude;
  const moon = planets.Moon.longitude;
  planets.Tyche = {longitude: normalize(fixture.asc + (day ? moon - sun : sun - moon))};
  planets.Daimon = {longitude: normalize(fixture.asc + (day ? sun - moon : moon - sun))};
  const tema = {
    houses: {egizia: {
      ascendant: fixture.asc, mc: fixture.mc, ds: fixture.ds, house: fixture.cusps,
    }},
    planets,
  };
  const context = createContext({
    governatoriSegni: RULERS,
    // The original functions ask the astronomical module for a new Moon.
    // Inject only its longitude; never call the Swiss-backed implementation.
    getLunaNuova: () => ({render: {planets: {Moon: {longitude: fixture.newMoon}}}}),
    __theme: tema,
    __day: day,
  }, {codeGeneration: {strings: false, wasm: false}});
  new Script(`${sourceMathFunctions(source)}\n` +
    'globalThis.__rows = [getPartiArabeEssenziali(__theme, "egizia"), ...' +
    'getPartiArabeAbuMashar(__theme, "egizia", __day)].flat();',
  ).runInContext(context, {timeout: 2000});
  return context.__rows.map(row => {
    let plus;
    const planetName = Object.keys(planets).find(name =>
      name.toUpperCase() === String(row.nomePianetaHighlight).toUpperCase());
    if (planetName) {
      plus = planets[planetName].longitude;
    } else if (row.nomePianetaHighlight === 'ASSE-ds') {
      plus = fixture.ds;
    } else if (row.nomePianetaHighlight === 'MC') {
      plus = fixture.mc;
    } else if (row.nomePianetaHighlight.startsWith('LNG-')) {
      plus = Number(row.nomePianetaHighlight.slice(4));
    } else {
      throw new Error(`Unsupported original Regolo highlight: ${row.nomePianetaHighlight}`);
    }
    if (!Number.isFinite(row.lngOffs) || !Number.isFinite(plus)) {
      throw new Error(`Non-finite original Regolo result: ${row.nome}`);
    }
    return {
      name: row.nome, description: row.descrizione,
      longitudeDeg: normalize(row.lngOffs + plus),
    };
  });
}

export async function compareRegoloLegacyParts(source, options = {}) {
  const bytes = Buffer.isBuffer(source) ? source : Buffer.from(source, 'utf8');
  const actualBlob = createHash('sha1')
    .update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex');
  if (actualBlob !== EXPECTED_BLOB) {
    throw new Error(`Unexpected Regolo source blob: expected ${EXPECTED_BLOB}, got ${actualBlob}`);
  }
  const text = bytes.toString('utf8');
  const discrepancies = [];
  let checks = 0;
  for (const fixture of cases) {
    for (const sect of ['DAY', 'NIGHT']) {
      const legacy = extractLegacyRows(text, fixture, sect);
      const modern = calculateRegoloArabicParts({
        birthTimeKnown: true, sect, zodiac: 'TROPICAL', chartContextId: fixture.id,
        ascendantLongitudeDeg: fixture.asc, midheavenLongitudeDeg: fixture.mc,
        descendantLongitudeDeg: fixture.ds, newMoonLongitudeDeg: fixture.newMoon,
        planetsLongitudeDeg: Object.fromEntries(Object.keys(NAMES)
          .map((id, i) => [id, fixture.planets[i]])),
        houseCuspsDeg: fixture.cusps,
      }).entries;
      if (legacy.length !== REGOLO_ARABIC_PARTS_CATALOG.length || modern.length !== legacy.length) {
        throw new Error(`Regolo cardinality mismatch in ${fixture.id} ${sect}: ${legacy.length} legacy`);
      }
      for (let i = 0; i < modern.length; i++) {
        checks++;
        const actual = modern[i];
        const expected = legacy[i];
        const delta = circularResidual(actual.longitudeDeg, expected.longitudeDeg);
        if (actual.nameIt !== expected.name || actual.sourceFormula !== expected.description ||
            actual.status !== 'AVAILABLE' || delta > (options.toleranceDeg ?? 1e-9)) {
          discrepancies.push({caseId: fixture.id, sect, id: actual.id,
            expectedName: expected.name, gotName: actual.nameIt,
            expectedFormula: expected.description, gotFormula: actual.sourceFormula,
            expectedLongitudeDeg: expected.longitudeDeg, gotLongitudeDeg: actual.longitudeDeg,
            circularResidualDeg: delta});
        }
      }
    }
  }
  return Object.freeze({sourceGitBlob: actualBlob, cases: cases.length * 2,
    comparisons: checks, differences: discrepancies.length,
    discrepancies: Object.freeze(discrepancies)});
}

async function main() {
  const args = process.argv.slice(2);
  const sourceFlag = args.indexOf('--source');
  if (sourceFlag < 0 || !args[sourceFlag + 1] || args.length !== 2) {
    throw new Error('Usage: node scripts/compare-regolo-legacy-parts.mjs --source <file-or->');
  }
  const input = args[sourceFlag + 1] === '-' ? process.stdin : await readFile(args[sourceFlag + 1]);
  const data = input === process.stdin ? await readStdin() : input;
  const result = await compareRegoloLegacyParts(data);
  console.log(JSON.stringify(result, null, 2));
  if (result.differences !== 0) process.exitCode = 1;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch(error => {console.error(error.message); process.exitCode = 1;});
}
