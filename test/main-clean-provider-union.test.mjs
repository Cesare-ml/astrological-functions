import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateNatalWithProvider, placeNatalBodiesInHouses } from 'astrological-functions/ephemeris-provider';
import { calculateDodecatemoriaFacts } from 'astrological-functions/dodecatemoria';
import { calculateDodecatemoriaBatchFacts } from 'astrological-functions/dodecatemoria-batch';
import { classifyZodiacDecan } from 'astrological-functions/zodiac-decan-facts';
import { locateLongitudeInHouses } from 'astrological-functions';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const metadata = Object.freeze({
  center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
  engineVersion: 'synthetic', kernelSetId: 'synthetic', timeModel: 'synthetic',
});

test('main-clean integration keeps all private typed ESM subpaths', () => {
  assert.equal(manifest.private, true);
  assert.deepEqual(Object.keys(manifest.exports), [
    '.', './ephemeris-provider', './dodecatemoria',
    './dodecatemoria-batch', './zodiac-decan-facts',
  ]);
});

test('last binary64 Pisces longitude reaches decan and correct house unchanged', async () => {
  const near360 = 359.99999999999994;
  const context = {
    datetimeUtc: '2026-11-14T12:00:00Z',
    latitudeDeg: 44.8, longitudeDegEast: 11.9,
  };
  const chart = await calculateNatalWithProvider({
    ...context, bodyNames:['Sun'],
    provider:{async getGeocentricEcliptic(){
      return {longitudeDeg:near360,latitudeDeg:0,metadata};
    }},
  });
  assert.equal(chart.bodies.Sun.longitudeDeg, near360);
  assert.equal(chart.bodies.Sun.zodiacSignIndex, 11);
  assert.equal(classifyZodiacDecan({
    longitudeDeg:near360,zodiac:{type:'TROPICAL'}
  }).globalDecanIndex, 35);
  const houses = placeNatalBodiesInHouses({
    chart, birthTimeKnown:true,
    cuspSet:{
      houseSystem:'VEHLOW',calculationProfile:'CANONICAL_V1',
      cusps:Array.from({length:12},(_,i)=>i*30),
      metadata:{
        houseSystem:'VEHLOW',placementMethod:'CUSP_INTERVAL',
        ...context,ephemerisProvenance:chart.ephemerisProvenance,
      },
    },
  });
  assert.equal(houses.placements.Sun.house, 12);
  assert.equal(chart.houses, null);
  assert.equal(locateLongitudeInHouses(29.999999999999996,
    Array.from({length:12},(_,i)=>(30+i*30)%360)).house,12);
});

test('main PR98 safe dodecatemoria batch resists input map override',()=>{
  let calls=0;
  const points=[{id:'Sun',longitudeDeg:11}];
  points.map=()=>{calls++;return [{id:'FORGED'}];};
  const actual=calculateDodecatemoriaBatchFacts({
    points,method:'PAULUS_13_V1',zodiac:'TROPICAL',
  });
  const single=calculateDodecatemoriaFacts({
    longitudeDeg:11,method:'PAULUS_13_V1',zodiac:'TROPICAL',
  });
  assert.equal(calls,0);
  assert.equal(actual.points[0].id,'Sun');
  assert.deepEqual(actual.points[0].facts,single);
  assert.ok(Object.isFrozen(actual.points));
});
