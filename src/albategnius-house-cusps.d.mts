import type {PorphyryAngleSource} from './porphyry-houses.mjs';

export interface AlbategniusHouseInput {
  readonly datetimeUtc:string;
  readonly birthTimeKnown:true;
  readonly armcDeg:number;
  readonly trueObliquityDeg:number;
  readonly ascendantDeg:number;
  readonly midheavenDeg:number;
  readonly angleModel:string;
  readonly source:PorphyryAngleSource;
}

export interface AlbategniusHouseCusps {
  readonly contract:'AlbategniusHouseCusps';
  readonly contractVersion:'0.1.0-experimental';
  readonly houseSystem:'ALBATEGNIUS';
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
  /** Prime vertical parameters in degrees at declination |latitude|/3 and 2|latitude|/3. */
  readonly primeVerticalDivisionAnglesDeg:readonly [number,number];
  readonly cuspsDeg:readonly number[];
  readonly interpretation:'FACTS_ONLY';
  readonly validation:'CALLER_ASSERTED_ASTRONOMY_WITH_ROUNDED_EXTERNAL_REFERENCE_FIXTURES';
}
export declare function calculateAlbategniusHouseCusps(input:AlbategniusHouseInput):
  Readonly<AlbategniusHouseCusps>;
