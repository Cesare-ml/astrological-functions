import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalize360, signedAngularDistance, angularSeparation, zodiacSignIndex,
  dodecatemoriaLongitude, locateLongitudeInHouses, calculateCrossAspects,
} from '../src/index.mjs';

test('wrap-around angles and zodiac indices',()=>{
  assert.equal(normalize360(-1),359);
  assert.equal(normalize360(720),0);
  assert.equal(signedAngularDistance(359,1),2);
  assert.equal(signedAngularDistance(1,359),-2);
  assert.equal(angularSeparation(359,1),2);
  assert.equal(zodiacSignIndex(359.99),11);
  assert.equal(zodiacSignIndex(360),0);
  assert.equal(dodecatemoriaLongitude(30),30);
});

test('house intervals wrap through Aries; exact cusp belongs to starting house',()=>{
  const cusps=[345,15,45,75,105,135,165,195,225,255,285,315];
  assert.equal(locateLongitudeInHouses(0,cusps).house,1);
  assert.equal(locateLongitudeInHouses(15,cusps).house,2);
  assert.equal(locateLongitudeInHouses(344.99,cusps).house,12);
  assert.equal(locateLongitudeInHouses(345,cusps).house,1);
  assert.throws(()=>locateLongitudeInHouses(100,Array(12).fill(10)),e=>e.code==='INVALID_CUSPS');
});

test('aspect orb exact boundary and directional source ownership',()=>{
  const defs=[{id:'conjunction',angleDeg:0,maxOrbDeg:3},{id:'opposition',angleDeg:180,maxOrbDeg:2}];
  const a=[{name:'Mars',longitudeDeg:359}];
  const b=[{name:'Sun',longitudeDeg:2},{name:'Moon',longitudeDeg:179}];
  const facts=calculateCrossAspects({direction:'A_TO_B',sourcePoints:a,targetPoints:b,aspectDefinitions:defs});
  assert.equal(facts.length,2);
  assert.equal(facts[0].absoluteOrbDeg,3);
  assert.equal(facts[0].source.name,'Mars');
  assert.equal(facts[0].direction,'A_TO_B');
  const reverse=calculateCrossAspects({direction:'B_TO_A',sourcePoints:b,targetPoints:a,aspectDefinitions:defs});
  assert.equal(reverse[0].source.name,'Sun');
  assert.throws(()=>calculateCrossAspects({direction:'NONE',sourcePoints:a,targetPoints:b,aspectDefinitions:defs}),e=>e.code==='INVALID_DIRECTION');
});

test('experimental provider boundary accepts only apparent Earth-centered ecliptic-of-date', async()=>{
  const { calculateNatalWithProvider } = await import('../src/index.mjs');
  const input={datetimeUtc:'2026-11-09T12:00:00Z',latitudeDeg:44.8,longitudeDegEast:11.9,bodyNames:['Sun']};
  const good={getGeocentricEcliptic:async()=>({longitudeDeg:359.5,latitudeDeg:0,longitudeSpeedDegPerDay:1,
    metadata:{center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT',engineVersion:'synthetic-test'}})};
  const result=await calculateNatalWithProvider({...input,provider:good});
  assert.equal(result.bodies.Sun.zodiacSignIndex,11);
  assert.equal(result.houses,null);
  const geometric={getGeocentricEcliptic:async()=>({longitudeDeg:359,latitudeDeg:0,
    metadata:{center:'EARTH',frame:'J2000',corrections:'GEOMETRIC'}})};
  await assert.rejects(()=>calculateNatalWithProvider({...input,provider:geometric}),e=>e.code==='INCOMPATIBLE_EPHEMERIS');
});

test('natal provider accepts the closed ecliptic-latitude range and rejects impossible values', async()=> {
  const { calculateNatalWithProvider } = await import('../src/index.mjs');
  const base = {
    datetimeUtc: '2026-11-16T12:00:00Z',
    latitudeDeg: 44.8,
    longitudeDegEast: 11.9,
    bodyNames: ['Sun'],
  };
  const matchingMetadata = {
    center: 'EARTH',
    frame: 'ECLIPTIC_OF_DATE',
    corrections: 'APPARENT',
    engineVersion: 'synthetic-test',
  };

  for (const latitudeDeg of [-90, -23.4, 0, 51.5, 90]) {
    const provider = {
      getGeocentricEcliptic: async () => ({
        longitudeDeg: 42,
        latitudeDeg,
        metadata: matchingMetadata,
      }),
    };
    const result = await calculateNatalWithProvider({ ...base, provider });
    assert.equal(result.bodies.Sun.latitudeDeg, latitudeDeg);
  }

  for (const latitudeDeg of [-90.000001, 90.000001, NaN, Infinity, -Infinity]) {
    let calls = 0;
    const provider = {
      getGeocentricEcliptic: async () => {
        calls += 1;
        return { longitudeDeg: 42, latitudeDeg, metadata: matchingMetadata };
      },
    };
    await assert.rejects(
      () => calculateNatalWithProvider({ ...base, provider }),
      error => error.code === 'INCOMPATIBLE_EPHEMERIS',
      String(latitudeDeg),
    );
    assert.equal(calls, 1, 'provider was queried once, but no invalid result may be published');
  }
});
