import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateVirgoStarsStarContacts as contacts} from '../src/virgostars-star-contacts.mjs';

test('axis horizon bands use caller-provided north-east azimuth and independent altitude orb',()=>{
  for(const az of [20,90,160])assert.equal(contacts({longitudeDeg:12,trueAltitudeDeg:-0.3,
    azimuthDeg:az,orbDeg:1,points:{}}).axis,'AS');
  for(const az of [200,270,340])assert.equal(contacts({longitudeDeg:12,trueAltitudeDeg:0.7,
    azimuthDeg:az,orbDeg:1,points:{}}).axis,'DS');
  assert.equal(contacts({longitudeDeg:12,trueAltitudeDeg:0.7,azimuthDeg:315,
    orbDeg:0.5,points:{}}).axis,null);
});
test('circular conjunctions include the Aries cusp and no invented contacts',()=>{
  const r=contacts({longitudeDeg:359.7,trueAltitudeDeg:40,azimuthDeg:0,
    orbDeg:1,points:{Sun:0.2,Moon:3,Venus:358.5}});
  assert.deepEqual(r.conjunctions,['Sun']);assert.equal(r.axis,null);
});
test('invalid finite inputs fail before producing astrological facts',()=>{
  assert.throws(()=>contacts({longitudeDeg:Infinity,trueAltitudeDeg:0,azimuthDeg:90,
    orbDeg:1,points:{}}),/Finite/);
});
