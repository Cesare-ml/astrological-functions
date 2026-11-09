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
