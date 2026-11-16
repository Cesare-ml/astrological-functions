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

  // Impossible ISO-shaped UTC values must fail before the provider is called.
  const invalidUtc = [
    '2026-02-29T12:00:00Z',
    '2026-02-30T12:00:00Z',
    '2026-04-31T12:00:00Z',
    '2026-01-01T24:00:00Z',
    '2026-01-01T12:60:00Z',
    '2026-01-01T12:00:60Z',
  ];
  for (const datetimeUtc of invalidUtc) {
    let calls = 0;
    const spy = {getGeocentricEcliptic:async()=>{calls++; return {
      longitudeDeg:1,latitudeDeg:0,
      metadata:{center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT'}
    };}};
    await assert.rejects(
      ()=>calculateNatalWithProvider({...input,datetimeUtc,provider:spy}),
      error=>error.code==='INVALID_UTC',
      datetimeUtc
    );
    assert.equal(calls,0, `provider must not be called for ${datetimeUtc}`);
  }

  const leapDay = await calculateNatalWithProvider({
    ...input,datetimeUtc:'2024-02-29T12:34:56Z',provider:good
  });
  assert.equal(leapDay.datetimeUtc,'2024-02-29T12:34:56Z');

  const fractional = await calculateNatalWithProvider({
    ...input,datetimeUtc:'2026-11-16T12:34:56.123456Z',provider:good
  });
  assert.equal(fractional.datetimeUtc,'2026-11-16T12:34:56.123456Z');

  const geometric={getGeocentricEcliptic:async()=>({longitudeDeg:359,latitudeDeg:0,
    metadata:{center:'EARTH',frame:'J2000',corrections:'GEOMETRIC'}})};
  await assert.rejects(()=>calculateNatalWithProvider({...input,provider:geometric}),e=>e.code==='INCOMPATIBLE_EPHEMERIS');
});
