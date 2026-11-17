import type {PorphyryAngleSource} from './porphyry-houses.mjs';

export interface DeclinationArcHouseCommonInput {
  readonly datetimeUtc:string;
  readonly birthTimeKnown:true;
  readonly armcDeg:number;
  readonly trueObliquityDeg:number;
  readonly ascendantDeg:number;
  readonly midheavenDeg:number;
  readonly angleModel:string;
  readonly source:PorphyryAngleSource;
}
export interface ExternalSunDeclination {
  readonly datetimeUtc:string;
  readonly declinationDeg:number;
  readonly modelId:string;
  readonly bodyId:'SUN';
  readonly frame:'EQUATORIAL_OF_DATE';
  readonly center:'EARTH';
  readonly corrections:'APPARENT';
  readonly observerType:'GEOCENTRIC';
  readonly source:Readonly<{
    readonly engineVersion:string;
    readonly kernelSetId:string;
    readonly timeModel:string;
  }>;
}
export type ApcHouseInput=DeclinationArcHouseCommonInput;
export interface SunshineHouseInput extends DeclinationArcHouseCommonInput {
  readonly sun:ExternalSunDeclination;
}
export interface DeclinationArcHouseCusps {
  readonly contract:'DeclinationArcHouseCusps';
  readonly contractVersion:'0.1.0-experimental';
  readonly houseSystem:'APC'|'SUNSHINE';
  readonly datetimeUtc:string;
  readonly birthTimeKnown:true;
  readonly armcDeg:number;
  readonly trueObliquityDeg:number;
  readonly angleModel:string;
  readonly angles:Readonly<{
    readonly ascendantDeg:number;
    readonly icDeg:number;
    readonly descendantDeg:number;
    readonly midheavenDeg:number;
  }>;
  readonly source:PorphyryAngleSource;
  readonly declinationCircleDeg:number;
  readonly declinationReference:'ASCENDANT_DERIVED'|'EXTERNAL_APPARENT_SUN';
  readonly sun:Readonly<ExternalSunDeclination>|null;
  readonly semiDiurnalArcDeg:number;
  readonly semiNocturnalArcDeg:number;
  readonly cuspsDeg:readonly number[];
  readonly oppositeIntermediateCuspsGuaranteed:false;
  readonly interpretation:'FACTS_ONLY';
  readonly validation:'CALLER_ASSERTED_ASTRONOMY_NOT_INDEPENDENTLY_VERIFIED';
}
export declare function calculateApcHouseCusps(input:ApcHouseInput):
  Readonly<DeclinationArcHouseCusps&{
    readonly houseSystem:'APC';
    readonly declinationReference:'ASCENDANT_DERIVED';
    readonly sun:null;
  }>;
export declare function calculateSunshineHouseCusps(input:SunshineHouseInput):
  Readonly<DeclinationArcHouseCusps&{
    readonly houseSystem:'SUNSHINE';
    readonly declinationReference:'EXTERNAL_APPARENT_SUN';
    readonly sun:Readonly<ExternalSunDeclination>;
  }>;
