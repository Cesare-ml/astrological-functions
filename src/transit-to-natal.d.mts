/** Experimental fact-only sky-to-natal API. No ephemeris calculation or interpretation. */
export interface TransitEphemerisProvenance {
  readonly engineVersion: string;
  readonly kernelSetId: string;
  readonly timeModel: string;
}
export interface TransitBody {
  readonly name: string;
  readonly longitudeDeg: number;
  readonly ephemerisMetadata: TransitEphemerisProvenance & {
    readonly center: 'EARTH';
    readonly frame: 'ECLIPTIC_OF_DATE';
    readonly corrections: 'APPARENT';
  };
}
export interface TransitChartSnapshot {
  readonly contract: 'NatalChartResult';
  readonly contractVersion: '0.1.0-experimental';
  readonly datetimeUtc: string;
  readonly ephemerisProvenance: TransitEphemerisProvenance;
  readonly bodies: Readonly<Record<string, TransitBody>>;
}
export interface TransitAspectDefinition {
  readonly id: string;
  readonly angleDeg: number;
  readonly maxOrbDeg: number;
}
export interface TransitAspectFact {
  readonly direction: 'SKY_TO_NATAL';
  readonly source: Readonly<{ name: string; longitudeDeg: number; type: string }>;
  readonly target: Readonly<{ name: string; longitudeDeg: number; type: string }>;
  readonly aspectId: string;
  readonly exactAngleDeg: number;
  readonly actualAngleDeg: number;
  readonly signedOrbDeg: number;
  readonly absoluteOrbDeg: number;
  readonly configuredMaxOrbDeg: number;
}
export interface TransitToNatalFacts {
  readonly contract: 'TransitToNatalFacts';
  readonly contractVersion: '0.1.0-experimental';
  readonly direction: 'SKY_TO_NATAL';
  readonly natalDatetimeUtc: string;
  readonly skyDatetimeUtc: string;
  readonly birthTimeKnown: true;
  readonly timeReliability: 'KNOWN_BIRTH_INSTANT';
  readonly ephemerisProvenance: TransitEphemerisProvenance;
  readonly selectedSkyBodyNames: readonly string[];
  readonly selectedNatalBodyNames: readonly string[];
  readonly aspects: readonly TransitAspectFact[];
  readonly houses: null;
  readonly angles: null;
  readonly warnings: readonly [];
}
export declare function calculateTransitToNatal(input: {
  readonly natalChart: TransitChartSnapshot;
  readonly skyChart: TransitChartSnapshot;
  readonly birthTimeKnown: true;
  readonly natalBodyNames: readonly string[];
  readonly skyBodyNames: readonly string[];
  readonly aspectDefinitions: readonly TransitAspectDefinition[];
}): TransitToNatalFacts;
