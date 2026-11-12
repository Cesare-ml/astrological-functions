/**
 * Opt-in migration gate from explicitly labeled experimental natal-chart
 * snapshots to the canonical transit-facts input shape.
 *
 * NO astronomical calculation, zodiac inference, or fallback is performed.
 */
import { AstrologyError, normalize360 } from './index.mjs';

function fail(code, message) { throw new AstrologyError(code, message); }
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function identifier(value) { return typeof value === 'string' && value.length > 0 && value.trim() === value; }
const PROVENANCE_KEYS = Object.freeze(['engineVersion', 'kernelSetId', 'timeModel']);
const EXPECTED = Object.freeze({center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT'});

function datetime(value) {
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0,19) !== value.slice(0,19))
    fail('INVALID_UTC', 'An actual ISO UTC calendar instant ending Z is required');
  return value;
}
function zodiac(value) {
  if (!object(value)) fail('MISSING_ZODIAC', 'Legacy snapshot must explicitly declare its original zodiac');
  if (value.type === 'TROPICAL' && !Object.hasOwn(value,'ayanamsaId'))
    return Object.freeze({type:'TROPICAL'});
  if (value.type === 'SIDEREAL' && identifier(value.ayanamsaId))
    return Object.freeze({type:'SIDEREAL',ayanamsaId:value.ayanamsaId});
  fail('INVALID_ZODIAC', 'Tropical forbids ayanamsa; sidereal needs a versioned ayanamsaId');
}
function provenance(value) {
  if (!object(value) || PROVENANCE_KEYS.some(k=>!identifier(value[k])))
    fail('MISSING_PROVENANCE','Complete engine, kernel and time-model provenance is required');
  return Object.freeze({engineVersion:value.engineVersion,kernelSetId:value.kernelSetId,timeModel:value.timeModel});
}
function selectedNames(names) {
  if (!Array.isArray(names) || names.length < 1 || names.length > 32)
    fail('INVALID_BODIES','Select 1..32 explicit body IDs');
  const list = Array.from(names, name => {
    if (!identifier(name)) fail('INVALID_BODIES','Body IDs must be nonempty and trimmed');
    return name;
  });
  if (new Set(list).size !== list.length)
    fail('INVALID_BODIES','Duplicate body selections are forbidden');
  return Object.freeze(list);
}
function selectedBody(chart, name, declared) {
  if (!Object.hasOwn(chart.bodies,name))
    fail('INVALID_BODIES', 'Selected body is not an own key of the natal chart');
  const body = chart.bodies[name];
  if (!object(body) || body.name !== name ||
      typeof body.longitudeDeg !== 'number' || !Number.isFinite(body.longitudeDeg))
    fail('INVALID_POINT','Selected body name or longitude is invalid');
  const speed = body.longitudeSpeedDegPerDay;
  if (speed !== undefined && speed !== null && (typeof speed !== 'number' || !Number.isFinite(speed)))
    fail('INVALID_POINT','Longitude speed must be finite when supplied');
  const meta = body.ephemerisMetadata;
  if (!object(meta) || Object.entries(EXPECTED).some(([k,expected])=>meta[k]!==expected) ||
      PROVENANCE_KEYS.some(k=>meta[k]!==declared[k]))
    fail('INCOMPATIBLE_EPHEMERIS', 'Selected body frame/center/corrections or provenance do not match chart');
  return Object.freeze({name,type:'body',longitudeDeg:normalize360(body.longitudeDeg),
    longitudeSpeedDegPerDay:speed ?? null});
}

/**
 * The chart must have its own explicit zodiac metadata (missing from some
 * legacy snapshots). Never guess tropical or sidereal from longitudes.
 */
export function normalizeLegacyTransitSnapshot(input) {
  if (!object(input) || !object(input.chart))
    fail('INVALID_ARGUMENT','Chart and explicit selectedBodyNames are required');
  const chart = input.chart;
  if (chart.contract !== 'NatalChartResult' || chart.contractVersion !== '0.1.0-experimental')
    fail('INVALID_CHART','Expected a versioned experimental NatalChartResult');
  const datetimeUtc = datetime(chart.datetimeUtc);
  const selectedZodiac = zodiac(chart.zodiac);
  const declared = provenance(chart.ephemerisProvenance);
  if (!object(chart.bodies))
    fail('INVALID_CHART','Expected an explicit named bodies map');
  const names = selectedNames(input.selectedBodyNames);
  const points = Object.freeze(names.map(name=>selectedBody(chart,name,declared)));
  const ephemeris = Object.freeze({...EXPECTED,...declared});
  const snapshot = Object.freeze({datetimeUtc,zodiac:selectedZodiac,ephemeris,points});
  return Object.freeze({
    contract:'TransitSnapshotNormalizationResult',
    contractVersion:'0.1.0-experimental',
    status:'SOURCE_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
    sourceContract:'NatalChartResult',
    selectedBodyNames:names,
    snapshot,
    warnings:Object.freeze([Object.freeze({
      code:'LEGACY_SOURCE_NOT_INDEPENDENTLY_VERIFIED',
      message:'Zodiac and per-body ephemeris metadata are validated as source assertions, not independent astronomical proof'
    })])
  });
}
