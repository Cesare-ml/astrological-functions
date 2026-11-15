/** Pure immutable view/filter of previously calculated midpoint matrix facts.
 * This module performs no astronomy. All external arrays and mutable fields
 * are read once into trusted snapshots before filtering. */
import { AstrologyError } from './index.mjs';

const fail=(code,message)=>{throw new AstrologyError(code,message);};

function selection(names,available,field) {
  if(names===null)return null;
  if(!Array.isArray(names))fail('INVALID_MATRIX_FILTER_SELECTION',field+' must be null or a dense array');
  const selected=new Set();
  for(let i=0;i<names.length;i++){
    if(!Object.hasOwn(names,i))fail('INVALID_MATRIX_FILTER_SELECTION',field+' has a sparse slot');
    const name=names[i];
    if(typeof name!=='string'||!name.trim()||name!==name.trim()||
       !available.has(name)||selected.has(name))
      fail('INVALID_MATRIX_FILTER_SELECTION',field+' has a missing, unknown, duplicate or malformed name');
    selected.add(name);
  }
  return selected;
}
function knownNames(array) {
  if(!Array.isArray(array))fail('INVALID_MATRIX_FILTER_MATRIX','Expected matrix point array');
  const names=new Set();
  for(let i=0;i<array.length;i++){
    if(!Object.hasOwn(array,i))fail('INVALID_MATRIX_FILTER_MATRIX','Sparse matrix point array');
    const point=array[i];
    if(!point||typeof point!=='object'||Array.isArray(point))fail('INVALID_MATRIX_FILTER_MATRIX','Malformed matrix point');
    const name=point.name;
    if(typeof name!=='string'||!name.trim()||name!==name.trim()||names.has(name))
      fail('INVALID_MATRIX_FILTER_MATRIX','Invalid or duplicate matrix point name');
    names.add(name);
  }
  return names;
}
function snapshotAxis(axis) {
  if(!axis||typeof axis!=='object'||Array.isArray(axis))
    fail('INVALID_MATRIX_FILTER_MATRIX','Missing midpoint axis');
  const rawAxis=axis.axisLongitudesDeg;
  if(!Array.isArray(rawAxis)||rawAxis.length!==2||
     !Object.hasOwn(rawAxis,0)||!Object.hasOwn(rawAxis,1))
    fail('INVALID_MATRIX_FILTER_MATRIX','Midpoint axis must contain two longitudes');
  const first=rawAxis[0],second=rawAxis[1];
  if(![first,second].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<360))
    fail('INVALID_MATRIX_FILTER_MATRIX','Invalid midpoint axis longitude');
  const copy={};
  for(const key of Object.keys(axis)){
    if(key==='axisLongitudesDeg'||key==='inputs')continue;
    const v=axis[key];
    if(v!==null&&(typeof v==='object'||typeof v==='function'))
      fail('INVALID_MATRIX_FILTER_MATRIX','Unexpected nested midpoint axis field');
    copy[key]=v;
  }
  if(Object.hasOwn(axis,'inputs')){
    const original=axis.inputs;
    if(!original||typeof original!=='object'||Array.isArray(original))
      fail('INVALID_MATRIX_FILTER_MATRIX','Invalid midpoint input metadata');
    const inputs={};
    for(const key of Object.keys(original)){
      const v=original[key];
      if(v!==null&&(typeof v==='object'||typeof v==='function'))
        fail('INVALID_MATRIX_FILTER_MATRIX','Invalid midpoint input metadata');
      inputs[key]=v;
    }
    copy.inputs=Object.freeze(inputs);
  }
  copy.axisLongitudesDeg=Object.freeze([first,second]);
  return Object.freeze(copy);
}

export function filterZodiacMidpointContactMatrix(input) {
  if(!input||typeof input!=='object'||Array.isArray(input)||
     !['matrix','sourceNames','targetNames','maxOrbDeg','excludePairMembers']
      .every(key=>Object.hasOwn(input,key)))
    fail('INVALID_MATRIX_FILTER','All five filter input fields must be explicitly supplied');
  const {matrix,sourceNames,targetNames,maxOrbDeg,excludePairMembers}=input;
  if(!matrix||typeof matrix!=='object'||Array.isArray(matrix))
    fail('INVALID_MATRIX_FILTER_MATRIX','A completed compatible midpoint matrix is required');
  const {contract,contractVersion,sourceCatalog,targetPoints:rawTargetPoints,rows:rawRows}=matrix;
  const sourcePoints=sourceCatalog?.points;
  if(contract!=='ZodiacMidpointContactMatrix'||contractVersion!=='0.1.0-experimental'||
     !Array.isArray(sourcePoints)||!Array.isArray(rawTargetPoints)||!Array.isArray(rawRows))
    fail('INVALID_MATRIX_FILTER_MATRIX','A completed compatible midpoint matrix is required');
  if(typeof maxOrbDeg!=='number'||!Number.isFinite(maxOrbDeg)||maxOrbDeg<0||maxOrbDeg>90)
    fail('INVALID_MATRIX_FILTER_ORB','Explicit inclusive orb must be finite in [0,90]');
  if(typeof excludePairMembers!=='boolean')
    fail('INVALID_MATRIX_FILTER_POLICY','excludePairMembers must be an explicit boolean');

  const availableSources=knownNames(sourcePoints);
  const availableTargets=knownNames(rawTargetPoints);
  const sources=selection(sourceNames,availableSources,'sourceNames');
  const targets=selection(targetNames,availableTargets,'targetNames');
  const rows=[],matchedCells=[];
  let consideredCellCount=0,excludedPairMemberCount=0;
  for(let ri=0;ri<rawRows.length;ri++){
    if(!Object.hasOwn(rawRows,ri))fail('INVALID_MATRIX_FILTER_MATRIX','Sparse matrix pair rows');
    const row=rawRows[ri];
    if(!row||typeof row!=='object'||Array.isArray(row))
      fail('INVALID_MATRIX_FILTER_MATRIX','Malformed pair row');
    const {firstName,secondName,midpointAxis,targetSweep}=row;
    const rowTargets=targetSweep?.targets;
    if(typeof firstName!=='string'||typeof secondName!=='string'||!Array.isArray(rowTargets)||
       !availableSources.has(firstName)||!availableSources.has(secondName))
      fail('INVALID_MATRIX_FILTER_MATRIX','Malformed pair row');
    if(sources!==null&&(!sources.has(firstName)||!sources.has(secondName)))continue;
    const axis=snapshotAxis(midpointAxis);
    const matchedTargets=[];
    for(let ti=0;ti<rowTargets.length;ti++){
      if(!Object.hasOwn(rowTargets,ti))fail('INVALID_MATRIX_FILTER_MATRIX','Sparse target facts');
      const target=rowTargets[ti];
      if(!target||typeof target!=='object'||Array.isArray(target))
        fail('INVALID_MATRIX_FILTER_MATRIX','Malformed target fact');
      const {name,longitudeDeg,contacts:rawContacts}=target;
      if(typeof name!=='string'||!availableTargets.has(name)||
         typeof longitudeDeg!=='number'||!Number.isFinite(longitudeDeg)||
         !Array.isArray(rawContacts)||rawContacts.length!==2)
        fail('INVALID_MATRIX_FILTER_MATRIX','Malformed target fact');
      const facts=[];
      for(let ci=0;ci<2;ci++){
        if(!Object.hasOwn(rawContacts,ci))fail('INVALID_MATRIX_FILTER_MATRIX','Sparse contact facts');
        const c=rawContacts[ci];
        if(!c||typeof c!=='object'||Array.isArray(c))fail('INVALID_MATRIX_FILTER_MATRIX','Malformed contact fact');
        const {longitudeDeg:axisLongitudeDeg,separationDeg}=c;
        if(typeof axisLongitudeDeg!=='number'||!Number.isFinite(axisLongitudeDeg)||
           typeof separationDeg!=='number'||!Number.isFinite(separationDeg)||
           separationDeg<0||separationDeg>180)
          fail('INVALID_MATRIX_FILTER_MATRIX','Invalid contact geometry');
        facts.push({longitudeDeg:axisLongitudeDeg,separationDeg});
      }
      if(targets!==null&&!targets.has(name))continue;
      if(excludePairMembers&&(name===firstName||name===secondName)){
        excludedPairMemberCount++;continue;
      }
      consideredCellCount++;
      const matchedAxes=[];
      for(const c of facts)if(c.separationDeg<=maxOrbDeg)matchedAxes.push(c.longitudeDeg);
      if(!matchedAxes.length)continue;
      const fact=Object.freeze({
        firstName,secondName,targetName:name,targetLongitudeDeg:longitudeDeg,
        nearestAxisSeparationDeg:Math.min(facts[0].separationDeg,facts[1].separationDeg),
        matchingAxisLongitudesDeg:Object.freeze(matchedAxes),
      });
      matchedTargets.push(fact);matchedCells.push(fact);
    }
    rows.push(Object.freeze({firstName,secondName,midpointAxis:axis,matchedTargets:Object.freeze(matchedTargets)}));
  }
  const sourceNamesFilter=sources===null?null:Object.freeze([...sources].sort());
  const targetNamesFilter=targets===null?null:Object.freeze([...targets].sort());
  const frozenRows=Object.freeze(rows),frozenMatched=Object.freeze(matchedCells);
  return Object.freeze({
    contract:'ZodiacMidpointMatrixView',contractVersion:'0.1.0-experimental',
    sourceContractVersion:contractVersion,
    filters:Object.freeze({sourceNames:sourceNamesFilter,targetNames:targetNamesFilter,maxOrbDeg,excludePairMembers}),
    rows:frozenRows,matchedCells:frozenMatched,selectedPairCount:frozenRows.length,
    consideredCellCount,excludedPairMemberCount,matchedCellCount:frozenMatched.length,
    activePairCount:frozenRows.filter(r=>r.matchedTargets.length>0).length,
    calculationBasis:'EXISTING_MIDPOINT_CONTACT_GEOMETRY',interpretation:'FACTS_ONLY',
  });
}
