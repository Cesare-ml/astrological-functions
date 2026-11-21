export type RegoloPart=Readonly<{
  nome:string;descrizione:string;lngOffs:number;
  nomePianetaHighlight:string;nomePianetaCardinale:string;
}>;
export type RegoloArabicPartsInput=Readonly<{
  ascendantDeg:number;mcDeg:number;cuspsDeg:readonly number[];
  planets:Readonly<Record<string,number>>;sect:'DAY'|'NIGHT';
  previousNewMoonDeg?:number;
}>;
export function calculateRegoloArabicParts(input:RegoloArabicPartsInput):Readonly<{
  essenziali:readonly RegoloPart[];
  abumashar:readonly (readonly RegoloPart[])[];
}>;
