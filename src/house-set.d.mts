import type { VehlowHouseCusps } from './vehlow-houses.mjs';
import type { PorphyryHouseCusps } from './porphyry-houses.mjs';
import type { PlacidusHouseCusps } from './placidus-houses.mjs';
import type { RegiomontanusHouseCusps } from './regiomontanus-houses.mjs';
import type { KochHouseCusps } from './koch-houses.mjs';
export interface HouseSetInput {
  readonly datetimeUtc:string; readonly birthTimeKnown:true;
  readonly ut1JulianDay:number; readonly ttJulianDay:number;
  readonly latitudeDeg:number; readonly longitudeDegEast:number;
  readonly engineVersion:string; readonly kernelSetId:string; readonly timeModel:string;
}
export interface HouseAngleProvider {
  calculateHouseAngles(input: Pick<HouseSetInput,'ut1JulianDay'|'ttJulianDay'|'latitudeDeg'|'longitudeDegEast'>): {
    readonly model:'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME';
    readonly ut1JulianDay:number; readonly ttJulianDay:number; readonly latitudeDeg:number; readonly longitudeDegEast:number;
    readonly armcDeg:number; readonly ascendantDeg:number; readonly midheavenDeg:number; readonly trueObliquityDeg:number;
  };
}
export interface ExperimentalHouseSet {
  readonly contract:'ExperimentalHouseSet'; readonly contractVersion:'0.1.0-experimental';
  readonly validation:'CALLER_ASSERTED_INPUTS_NOT_INDEPENDENTLY_VERIFIED';
  readonly houses: Readonly<{vehlow:VehlowHouseCusps;porphyry:PorphyryHouseCusps;placidus:PlacidusHouseCusps;regiomontanus:RegiomontanusHouseCusps;koch:KochHouseCusps}>;
}
export declare function calculateHouseSet(input:HouseSetInput, provider:HouseAngleProvider):Readonly<ExperimentalHouseSet>;
