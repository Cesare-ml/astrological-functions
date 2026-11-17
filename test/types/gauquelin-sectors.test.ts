import {calculateGauquelinSectors,locateGauquelinEclipticSector,
  locateGauquelinBodySector} from '../../src/gauquelin-sectors.mjs';
import type {GauquelinCommonInput,GauquelinExternalBody} from '../../src/gauquelin-sectors.mjs';

const common:GauquelinCommonInput={
  datetimeUtc:'2026-11-10T00:00:00Z',birthTimeKnown:true,
  armcDeg:62,ascendantDeg:159,midheavenDeg:65,trueObliquityDeg:23.4,
  angleModel:'TEST_V1',source:{engineVersion:'TEST_V1',kernelSetId:'K1',timeModel:'T1',
    frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',
    observer:{latitudeDeg:40,longitudeDegEast:12}},
};
const body:GauquelinExternalBody={
  datetimeUtc:common.datetimeUtc,rightAscensionDeg:65,declinationDeg:12,
  bodyId:'MARS',modelId:'MODEL_V1',frame:'EQUATORIAL_OF_DATE',center:'EARTH',
  corrections:'APPARENT',observerType:'GEOCENTRIC',source:{engineVersion:'TEST_V1',
    kernelSetId:'K1',timeModel:'T1'},
};
const cusps=calculateGauquelinSectors(common);
const first:number|undefined=cusps.sectorBoundariesDeg[0];
const count:36=cusps.sectorCount;
const a=locateGauquelinEclipticSector({...common,longitudeDeg:90});
const b=locateGauquelinBodySector({...common,body});
const p:number=a.position;
const methodA:'ECLIPTIC_POINT'=a.method;
const methodB:'TRUE_BODY'=b.method;
const id:string=b.body.bodyId;
void [first,count,p,methodA,methodB,id];
// @ts-expect-error - known birth time is required by the method contract
calculateGauquelinSectors({...common,birthTimeKnown:false});
// @ts-expect-error - string longitude cannot be passed
locateGauquelinEclipticSector({...common,longitudeDeg:'100'});
// @ts-expect-error - body coordinates must use equatorial-of-date frame
locateGauquelinBodySector({...common,body:{...body,frame:'ECLIPTIC_OF_DATE'}});
// @ts-expect-error - should not mutate a read-only sector count
cusps.sectorCount=12;
