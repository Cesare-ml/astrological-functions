export interface PlacidusPositionInput {
  readonly armcDeg:number; readonly latitudeDeg:number; readonly trueObliquityDeg:number;
  readonly eclipticLongitudeDeg:number; readonly eclipticLatitudeDeg:number;
  readonly frame:'ECLIPTIC_OF_DATE'; readonly zodiac:'TROPICAL'; readonly birthTimeKnown:true;
}
export interface PlacidusHousePosition {
  readonly contract:'PlacidusHousePosition'; readonly contractVersion:'0.1.0-experimental';
  readonly houseSystem:'PLACIDUS'; readonly housePosition:number; readonly house:number;
  readonly rightAscensionDeg:number; readonly declinationDeg:number; readonly hourAngleDeg:number;
  readonly input:Readonly<PlacidusPositionInput>;
  readonly diurnalSemiArcDeg:number; readonly validation:'CALLER_ASSERTED_EPOCH_FRAME_AND_CORRECTIONS';
}
export declare function calculatePlacidusHousePosition(input:PlacidusPositionInput):Readonly<PlacidusHousePosition>;
