import type {PorphyryAngleSource} from './porphyry-houses.mjs';

export interface AxialHouseCommonInput {
  readonly datetimeUtc:string;
  readonly birthTimeKnown:true;
  readonly armcDeg:number;
  readonly trueObliquityDeg:number;
  readonly angleModel:string;
  readonly source:PorphyryAngleSource;
}
export interface MeridianHouseInput extends AxialHouseCommonInput {
  readonly midheavenDeg:number;
}
export type MorinusHouseInput=AxialHouseCommonInput;
export interface CarterPoliEquatorialHouseInput extends AxialHouseCommonInput {
  readonly ascendantDeg:number;
}
export interface AxialHouseCusps {
  readonly contract:'AxialHouseCusps';
  readonly contractVersion:'0.1.0-experimental';
  readonly houseSystem:'MERIDIAN'|'MORINUS'|'CARTER_POLI_EQUATORIAL';
  readonly datetimeUtc:string;
  readonly birthTimeKnown:true;
  readonly armcDeg:number;
  readonly trueObliquityDeg:number;
  readonly angleModel:string;
  readonly source:Readonly<PorphyryAngleSource>;
  readonly referenceAscendantDeg:number|null;
  readonly referenceMidheavenDeg:number|null;
  readonly rightAscensionsDeg:readonly number[];
  readonly cuspsDeg:readonly number[];
  readonly geometry:'EQUATORIAL_POINT_PROJECTED_TO_ECLIPTIC'|'ECLIPTIC_POINTS_AT_EQUAL_RIGHT_ASCENSIONS';
  readonly interpretation:'FACTS_ONLY';
  readonly validation:'CALLER_ASSERTED_ASTRONOMY_NOT_INDEPENDENTLY_VERIFIED';
}
export declare function calculateMeridianHouseCusps(
  input:MeridianHouseInput,
):Readonly<AxialHouseCusps&{readonly houseSystem:'MERIDIAN'}>;
export declare function calculateMorinusHouseCusps(
  input:MorinusHouseInput,
):Readonly<AxialHouseCusps&{readonly houseSystem:'MORINUS'}>;
export declare function calculateCarterPoliEquatorialHouseCusps(
  input:CarterPoliEquatorialHouseInput,
):Readonly<AxialHouseCusps&{readonly houseSystem:'CARTER_POLI_EQUATORIAL'}>;
