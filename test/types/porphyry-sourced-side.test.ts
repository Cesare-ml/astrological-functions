import {adaptPorphyryToPinnedComparison, type PinnedPorphyryAdapterInput} from '../../src/porphyry-sourced-side.mjs';
import type {SourcedHouseSnapshot} from '../../src/house-source-consistency.mjs';
const datetimeUtc='2026-11-12T22:15:00Z';
const input: PinnedPorphyryAdapterInput={
  birthTimeKnown:true,
  produced:{contract:'PorphyryHouseCusps', contractVersion:'0.1.0-experimental',
    houseSystem:'PORPHYRY',datetimeUtc,
    angles:{ascendantDeg:10,icDeg:105,descendantDeg:190,midheavenDeg:285},
    cuspsDeg:[10,40,70,105,130,160,190,220,250,285,310,340],
    quadrantSpansDeg:[95,85,95,85], interpretation:'FACTS_ONLY',
    source:{engineVersion:'TEST',kernelSetId:'TEST',timeModel:'TEST',
      frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',
      observer:{latitudeDeg:44,longitudeDegEast:11}},
    validation:'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED'},
  declaredSource:{datetimeUtc,frame:'ECLIPTIC_OF_DATE',longitudeBasis:{type:'TROPICAL'},
    observerType:'TOPOCENTRIC',observer:{latitudeDeg:44,longitudeDegEast:11},
    engineVersion:'TEST',kernelSetId:'TEST',timeModel:'TEST',corrections:'APPARENT',
    calculationProfileId:'CANONICAL_V1'},
};
const side: SourcedHouseSnapshot=adaptPorphyryToPinnedComparison(input);
void side;
// @ts-expect-error no fake birth time
adaptPorphyryToPinnedComparison({...input,birthTimeKnown:false});
// @ts-expect-error no automatic sidereal conversion
adaptPorphyryToPinnedComparison({...input,declaredSource:{...input.declaredSource,longitudeBasis:{type:'SIDEREAL',ayanamsaId:'X'}}});
// @ts-expect-error cannot declare uncorrected geometry as apparent
adaptPorphyryToPinnedComparison({...input,declaredSource:{...input.declaredSource,corrections:'GEOMETRIC'}});
// @ts-expect-error detached output cusps cannot be mutated
side.snapshot.cuspsDeg[0]=0;
