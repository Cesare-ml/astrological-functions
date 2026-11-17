import type {PorphyryAngleSource} from './porphyry-houses.mjs';

export interface GauquelinCommonInput {
  readonly datetimeUtc:string;
  readonly birthTimeKnown:true;
  readonly armcDeg:number;
  readonly trueObliquityDeg:number;
  readonly ascendantDeg:number;
  readonly midheavenDeg:number;
  readonly angleModel:string;
  readonly source:PorphyryAngleSource;
}
export interface GauquelinExternalBody {
  readonly datetimeUtc:string;
  readonly rightAscensionDeg:number;
  readonly declinationDeg:number;
  readonly bodyId:string;
  readonly modelId:string;
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
export interface GauquelinCommonResult {
  readonly contractVersion:'0.1.0-experimental';
  readonly houseSystem:'GAUQUELIN_36';
  readonly datetimeUtc:string;
  readonly armcDeg:number;
  readonly trueObliquityDeg:number;
  readonly angleModel:string;
  readonly source:PorphyryAngleSource;
  readonly clockwise:true;
  readonly sectorCount:36;
  readonly interpretation:'FACTS_ONLY';
  readonly validation:'CALLER_ASSERTED_ASTRONOMY_NOT_INDEPENDENTLY_VERIFIED';
}
export interface GauquelinSectorBoundaries extends GauquelinCommonResult {
  readonly contract:'GauquelinSectorBoundaries';
  readonly angles:Readonly<{
    readonly ascendantDeg:number;
    readonly icDeg:number;
    readonly descendantDeg:number;
    readonly midheavenDeg:number;
  }>;
  /** Exactly 36 clockwise sector boundary ecliptic longitudes, index 0 = rise. */
  readonly sectorBoundariesDeg:readonly number[];
  readonly plusSectors:readonly number[];
}
export interface GauquelinSectorPosition extends GauquelinCommonResult {
  readonly contract:'GauquelinSectorPosition';
  readonly method:'ECLIPTIC_POINT'|'TRUE_BODY';
  readonly longitudeDeg:number|null;
  readonly body:Readonly<GauquelinExternalBody>|null;
  /** Integer index in [1, 36]. */
  readonly sector:number;
  /** Fractional position in [1, 37). */
  readonly position:number;
  readonly zone:'PLUS'|'MINUS';
  readonly phase:'ABOVE_HORIZON'|'BELOW_HORIZON';
  readonly hourAngleDeg:number;
  readonly semiDiurnalArcDeg:number;
  readonly semiNocturnalArcDeg:number;
}
export declare function calculateGauquelinSectors(input:GauquelinCommonInput):
  Readonly<GauquelinSectorBoundaries>;
export declare function locateGauquelinEclipticSector(
  input:GauquelinCommonInput&{readonly longitudeDeg:number}
):Readonly<GauquelinSectorPosition&{readonly method:'ECLIPTIC_POINT';readonly body:null;readonly longitudeDeg:number}>;
export declare function locateGauquelinBodySector(
  input:GauquelinCommonInput&{readonly body:GauquelinExternalBody}
):Readonly<GauquelinSectorPosition&{readonly method:'TRUE_BODY';readonly body:Readonly<GauquelinExternalBody>;readonly longitudeDeg:null}>;
