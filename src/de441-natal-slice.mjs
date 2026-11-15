/** Opt-in composition of experimental ephemeris and astrological geometry. */
import {AstrologyError} from './index.mjs';
import {calculateHouseSet} from './house-set.mjs';
import {calculatePlacidusHousePosition} from './placidus-position.mjs';

const TARGETS=Object.freeze(['Sun','Moon','Mercury','Venus','MarsBarycenter','JupiterBarycenter','SaturnBarycenter','UranusBarycenter','NeptuneBarycenter','PlutoBarycenter']);
const fail=(code,message)=>{throw new AstrologyError(code,message);};
const nonempty=value=>typeof value==='string' && value.length>0 && value===value.trim();

/**
 * Return explicitly requested DE441 targets, five cusp systems,
 * and Placidus point positions. This is NOT a full VirgoStars natal chart.
 * UT1 is supplied, not inferred; source labels and scientific limits remain
 * explicit. No unsupported target or computation is silently substituted.
 */
export function calculateExperimentalNatalSlice(input,provider) {
  if(!input || typeof input!=='object' || !provider || typeof provider.calculate!=='function' || typeof provider.calculateHouseAngles!=='function') fail('INVALID_INPUT','Explicit input and experimental position/angle provider are required');
  const {datetimeUtc,ut1JulianDay,latitudeDeg,longitudeDegEast,birthTimeKnown,zodiac,requestedTargets,engineVersion,kernelSetId,timeModel}=input;
  if(birthTimeKnown!==true) fail('BIRTH_TIME_REQUIRED','Known birth time is required');
  if(zodiac!=='TROPICAL') fail('INCOMPATIBLE_FRAME','Only explicit tropical coordinates are supported');
  const match=typeof datetimeUtc==='string' ? /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/.exec(datetimeUtc) : null;
  const milliseconds=match ? Date.parse(datetimeUtc) : NaN;
  const canonical=match ? `${match[1]}.${(match[2]??'').padEnd(3,'0')}Z` : '';
  if(!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString()!==canonical) fail('INVALID_UTC','A valid explicit UTC datetime with seconds is required');
  if(![ut1JulianDay,latitudeDeg,longitudeDegEast].every(Number.isFinite) || Math.abs(latitudeDeg)>=90 || Math.abs(longitudeDegEast)>180) fail('INVALID_INPUT','Explicit finite UT1 and nonpolar observer coordinates are required');
  // A coarse consistency guard for this modern UTC-only provider, not a
  // conversion of UTC to UT1. The caller supplies the actual UT1.
  if(Math.abs(ut1JulianDay-(milliseconds/86400000+2440587.5))*86400>2) fail('INCOHERENT_UT1','UT1 must be supplied for the same modern UTC instant');
  if(![engineVersion,kernelSetId,timeModel].every(nonempty)) fail('INVALID_SOURCE','Explicit engine, kernel and time-model identifiers are required');
  if(!Array.isArray(requestedTargets)) fail('INVALID_TARGETS','A nonempty explicit target list is required');
  const targetCount=requestedTargets.length;
  if(!Number.isInteger(targetCount) || targetCount===0 || targetCount>TARGETS.length) fail('INVALID_TARGETS','A nonempty explicit target list is required');
  const requested=[];
  for(let i=0;i<targetCount;i++){
    if(!Object.hasOwn(requestedTargets,i)) fail('INVALID_TARGETS','The requested target list must be dense');
    const target=requestedTargets[i];
    if(typeof target!=='string' || !TARGETS.includes(target) || requested.includes(target)) fail('UNSUPPORTED_TARGET','Targets must be unique supported DE441 names, including barycenter labels');
    requested.push(target);
  }
  const batch=provider.calculate(canonical);
  if(!batch || typeof batch!=='object') fail('INCOMPATIBLE_EPHEMERIS','Expected an experimental DE441 batch');
  const {contract,frame,center,corrections,timeModel:batchTimeModel,results}=batch;
  if(contract!=='VIRGOSTARS_EXPERIMENTAL_DE441_TRUE_ECLIPTIC_1' || frame!=='IAU2006_2000B_TRUE_ECLIPTIC_OF_DATE' || center!=='EARTH' || corrections!=='LIGHT_TIME_ANNUAL_ABERRATION' || batchTimeModel!=='BOUNDED_UTC_TRUNCATED_TDB' || !Array.isArray(results) || results.length!==TARGETS.length) fail('INCOMPATIBLE_EPHEMERIS','Expected the labelled experimental DE441 true-ecliptic batch');
  const states=[];
  for(let i=0;i<TARGETS.length;i++){
    if(!Object.hasOwn(results,i)) fail('INCOMPATIBLE_EPHEMERIS','The DE441 target batch must be dense');
    const row=results[i];
    if(!row || typeof row!=='object') fail('INCOMPATIBLE_EPHEMERIS','Each DE441 target must contain a state');
    const {target,ttJulianDay,tdbJulianDay,longitudeDeg,latitudeDeg,distanceAu,longitudeSpeedDegPerTdbDay,latitudeSpeedDegPerTdbDay,distanceSpeedAuPerTdbDay}=row;
    if(target!==TARGETS[i]) fail('INCOMPATIBLE_EPHEMERIS','Target sequence must preserve DE441 center identity');
    if(![ttJulianDay,tdbJulianDay,longitudeDeg,latitudeDeg,distanceAu,longitudeSpeedDegPerTdbDay,latitudeSpeedDegPerTdbDay,distanceSpeedAuPerTdbDay].every(Number.isFinite) || longitudeDeg<0 || longitudeDeg>=360 || Math.abs(latitudeDeg)>90 || distanceAu<=0 || Math.abs(ttJulianDay-tdbJulianDay)>1/86400) fail('INCOMPATIBLE_EPHEMERIS','Invalid position, rate or epoch in DE441 batch');
    if(i>0 && (ttJulianDay!==states[0].ttJulianDay || tdbJulianDay!==states[0].tdbJulianDay)) fail('INCOHERENT_EPOCH','All positions must share TT and TDB reception epochs');
    states.push(Object.freeze({target,ttJulianDay,tdbJulianDay,longitudeDeg,latitudeDeg,distanceAu,longitudeSpeedDegPerTdbDay,latitudeSpeedDegPerTdbDay,distanceSpeedAuPerTdbDay}));
  }
  const ttJulianDay=states[0].ttJulianDay;
  const angleInput={ut1JulianDay,ttJulianDay,latitudeDeg,longitudeDegEast};
  const rawAngles=provider.calculateHouseAngles(angleInput);
  if(!rawAngles || typeof rawAngles!=='object') fail('INCOMPATIBLE_ANGLE_SOURCE','Expected explicit house angles');
  const {model,ut1JulianDay:angleUt1,ttJulianDay:angleTt,latitudeDeg:angleLat,longitudeDegEast:angleLon,armcDeg,ascendantDeg,midheavenDeg,trueObliquityDeg}=rawAngles;
  const angles=Object.freeze({model,ut1JulianDay:angleUt1,ttJulianDay:angleTt,latitudeDeg:angleLat,longitudeDegEast:angleLon,armcDeg,ascendantDeg,midheavenDeg,trueObliquityDeg});
  const set=calculateHouseSet({datetimeUtc:canonical,birthTimeKnown,ut1JulianDay,ttJulianDay,latitudeDeg,longitudeDegEast,engineVersion,kernelSetId,timeModel},{calculateHouseAngles:()=>angles});
  const source=Object.freeze({engineVersion,kernelSetId,timeModel,corrections,center:'EARTH',observerLongitudeDegEast:longitudeDegEast});
  const bodies=requested.map(target=>{
    const state=states[TARGETS.indexOf(target)];
    const placement=calculatePlacidusHousePosition({armcDeg:angles.armcDeg,latitudeDeg,trueObliquityDeg:angles.trueObliquityDeg,eclipticLongitudeDeg:state.longitudeDeg,eclipticLatitudeDeg:state.latitudeDeg,frame:'ECLIPTIC_OF_DATE',zodiac,birthTimeKnown,datetimeUtc:canonical,source});
    return Object.freeze({state,placidusPosition:placement});
  });
  return Object.freeze({contract:'ExperimentalDe441NatalSlice',contractVersion:'0.1.0-experimental',datetimeUtc:canonical,ut1JulianDay,ttJulianDay,latitudeDeg,longitudeDegEast,zodiac,bodies:Object.freeze(bodies),houses:set.houses,source,
    warnings:Object.freeze(['NOT_SWISS_PARITY','SOLAR_DEFLECTION_OMITTED','PLANET_SYSTEM_BARYCENTERS','NO_CHIRON_OR_LUNAR_POINTS','NO_SOUTHERN_INVERSION','NO_PRODUCTION_INTEGRATION'])});
}
