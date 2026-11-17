import type {PorphyryAngleSource} from './porphyry-houses.mjs';

export interface HorizonHouseInput {
  readonly datetimeUtc:string;
  readonly birthTimeKnown:true;
  readonly ascendantDeg:number;
  readonly midheavenDeg:number;
  readonly armcDeg:number;
  readonly trueObliquityDeg:number;
  readonly angleModel:string;
  readonly source:PorphyryAngleSource;
}
export interface HorizonHouseCusps {
  readonly contract:'HorizonHouseCusps';
  readonly contractVersion:'0.1.0-experimental';
  readonly houseSystem:'KRUSINSKI_PISA_GOELZER'|'AZIMUTH';
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
  readonly cuspsDeg:readonly number[];
  readonly geometry:'ASCENDANT_ZENITH_GREAT_CIRCLE_TO_RIGHT_ASCENSION'|
    'HORIZON_AZIMUTH_VERTICAL_CIRCLE';
  readonly cusp1Anchor:'ASCENDANT'|'ANTIVERTEX_EAST_DIRECTION';
  readonly interpretation:'FACTS_ONLY';
  readonly validation:'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED';
}
export declare function calculateKrusinskiPisaGoelzerHouseCusps(
  input:HorizonHouseInput,
):Readonly<HorizonHouseCusps&{
  readonly houseSystem:'KRUSINSKI_PISA_GOELZER';
  readonly cusp1Anchor:'ASCENDANT';
}>;
export declare function calculateAzimuthHouseCusps(
  input:HorizonHouseInput,
):Readonly<HorizonHouseCusps&{
  readonly houseSystem:'AZIMUTH';
  readonly cusp1Anchor:'ANTIVERTEX_EAST_DIRECTION';
}>;
