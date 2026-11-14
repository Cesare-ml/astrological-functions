/** Experimental transit facts: caller-supplied astronomical positions only. */
export interface TransitBodyPoint {
  readonly name: string;
  readonly type?: 'body';
  readonly longitudeDeg: number;
  readonly longitudeSpeedDegPerDay?: number | null;
}
export type TransitZodiac =
  | Readonly<{type:'TROPICAL'; ayanamsaId?: never}>
  | Readonly<{type:'SIDEREAL'; ayanamsaId:string}>;
export interface TransitEphemerisProvenance {
  readonly engineVersion:string;
  readonly kernelSetId:string;
  readonly timeModel:string;
  readonly center:'EARTH';
  readonly frame:'ECLIPTIC_OF_DATE';
  readonly corrections:'APPARENT';
}
export interface TransitSnapshotInput {
  readonly datetimeUtc:string;
  readonly zodiac:TransitZodiac;
  readonly ephemeris:TransitEphemerisProvenance;
  readonly points:readonly TransitBodyPoint[];
}
export interface TransitAspectDefinition {
  readonly id:string;
  readonly angleDeg:number;
  readonly maxOrbDeg:number;
}
export interface TransitAspectFact {
  readonly direction:'SKY_TO_NATAL';
  readonly source:Readonly<{name:string; type:'body'; longitudeDeg:number}>;
  readonly target:Readonly<{name:string; type:'body'; longitudeDeg:number}>;
  readonly aspectId:string;
  readonly exactAngleDeg:number;
  readonly actualAngleDeg:number;
  readonly signedOrbDeg:number;
  readonly absoluteOrbDeg:number;
  readonly configuredMaxOrbDeg:number;
}
export interface TransitAspectFactsResult {
  readonly contract:'TransitAspectFactsResult';
  readonly contractVersion:'0.1.0-experimental';
  readonly direction:'SKY_TO_NATAL';
  readonly birthTimeKnown:true;
  readonly natal:Readonly<TransitSnapshotInput>;
  readonly sky:Readonly<TransitSnapshotInput>;
  readonly aspectDefinitions:readonly Readonly<TransitAspectDefinition>[];
  readonly aspects:readonly Readonly<TransitAspectFact>[];
  readonly houseMode:'UNAVAILABLE';
  readonly angles:null;
  readonly interpretation:'FACTS_ONLY';
  readonly warnings:readonly never[];
}
export declare function calculateTransitFacts(input:Readonly<{
  birthTimeKnown:true;
  natal:TransitSnapshotInput;
  sky:TransitSnapshotInput;
  aspectDefinitions:readonly TransitAspectDefinition[];
}>): TransitAspectFactsResult;
