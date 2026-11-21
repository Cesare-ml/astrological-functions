import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateRegoloArabicParts} from '../src/regolo-arabic-parts.mjs';
const input={ascendantDeg:45,mcDeg:130,cuspsDeg:Array.from({length:12},(_,i)=>(45+i*30)%360),
  planets:{Sun:12,Moon:52,Mercury:85,Venus:120,Mars:152,Jupiter:190,Saturn:260,
    Tyche:20,Daimon:200},sect:'DAY'};
test('preserves 15 Regolo essential parts and twelve Abu Mashar house groups',()=>{
  const result=calculateRegoloArabicParts(input);
  assert.equal(result.essenziali.length,15);
  assert.equal(result.abumashar.length,12);
  assert.equal(result.essenziali[0].nome,'Padre');
  assert.equal(result.essenziali[0].descrizione,'ASC+SOLE-SATURNO');
  assert.equal(result.essenziali[0].lngOffs,45-260);
  assert.equal(result.essenziali[0].nomePianetaHighlight,'Sun');
  assert.ok(result.abumashar.every(group=>group.length>0));
  assert.equal(result.abumashar[3].some(p=>p.nome==='esito'),false);
  assert.equal(result.abumashar[7].some(p=>p.nome==='tempo della morte'),false);
});
test('previous new moon is supplied, never synthesized from missing astronomy',()=>{
  const result=calculateRegoloArabicParts({...input,previousNewMoonDeg:70});
  assert.equal(result.abumashar[3].some(p=>p.nome==='esito'),true);
  assert.equal(result.abumashar[7].some(p=>p.nome==='tempo della morte'),true);
});
test('sect changes the rules; incomplete input fails closed',()=>{
  const day=calculateRegoloArabicParts(input);
  const night=calculateRegoloArabicParts({...input,sect:'NIGHT'});
  assert.notEqual(day.abumashar[0][0].descrizione,night.abumashar[0][0].descrizione);
  assert.throws(()=>calculateRegoloArabicParts({...input,planets:{Sun:12}}),/missing/);
});
