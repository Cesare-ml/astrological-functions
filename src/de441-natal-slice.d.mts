import type {HouseAngleProvider, ExperimentalHouseSet} from './house-set.mjs';
import type {PlacidusHousePosition} from './placidus-position.mjs';
export type De441Target='Sun'|'Moon'|'Mercury'|'Venus'|'MarsBarycenter'|'JupiterBarycenter'|'SaturnBarycenter'|'UranusBarycenter'|'NeptuneBarycenter'|'PlutoBarycenter';
export interface ExperimentalNatalSliceInput {
  readonly datetimeUtc:string; readonly ut1JulianDay:number; readonly latitudeDeg:number; readonly longitudeDegEast:number;
  readonly birthTimeKnown:true; readonly zodiac:'TROPICAL'; readonly requestedTargets:readonly De441Target[];
  readonly engineVersion:string; readonly kernelSetId:string; readonly timeModel:string;
}
export interface ExperimentalPosition {
  readonly target:De441Target; readonly ttJulianDay:number; readonly tdbJulianDay:number;
  readonly longitudeDeg:number; readonly latitudeDeg:number; readonly distanceAu:number;
  readonly longitudeSpeedDegPerTdbDay:number; readonly latitudeSpeedDegPerTdbDay:number; readonly distanceSpeedAuPerTdbDay:number;
}
export interface ExperimentalDe441Provider extends HouseAngleProvider {
  calculate(datetimeUtc:string):{readonly contract:'VIRGOSTARS_EXPERIMENTAL_DE441_TRUE_ECLIPTIC_1';readonly frame:'IAU2006_2000B_TRUE_ECLIPTIC_OF_DATE';readonly center:'EARTH';readonly corrections:'LIGHT_TIME_ANNUAL_ABERRATION';readonly timeModel:'BOUNDED_UTC_TRUNCATED_TDB';readonly results:readonly ExperimentalPosition[]};
}
export interface ExperimentalDe441NatalSlice {
  readonly contract:'ExperimentalDe441NatalSlice'; readonly contractVersion:'0.1.0-experimental';
  readonly datetimeUtc:string; readonly ut1JulianDay:number; readonly ttJulianDay:number; readonly latitudeDeg:number; readonly longitudeDegEast:number; readonly zodiac:'TROPICAL';
  readonly bodies:readonly Readonly<{state:ExperimentalPosition;placidusPosition:PlacidusHousePosition}>[];
  readonly houses:ExperimentalHouseSet['houses'];
  readonly source:Readonly<{engineVersion:string;kernelSetId:string;timeModel:string;corrections:string;center:'EARTH';observerLongitudeDegEast:number}>;
  readonly warnings:readonly string[];
}
export declare function calculateExperimentalNatalSlice(input:ExperimentalNatalSliceInput,provider:ExperimentalDe441Provider):Readonly<ExperimentalDe441NatalSlice>;
