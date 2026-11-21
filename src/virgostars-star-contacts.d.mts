export type StellarContactInput=Readonly<{
  longitudeDeg:number;trueAltitudeDeg:number;azimuthDeg:number;orbDeg:number;
  points:Readonly<Record<string,number>>;
}>;
export type StellarContactResult=Readonly<{conjunctions:readonly string[];axis:'AS'|'DS'|null}>;
export function calculateVirgoStarsStarContacts(input:StellarContactInput):StellarContactResult;
