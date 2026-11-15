/** Caller-supplied equatorial declinations; not a provider or frame transform. */
export type DeclinationDirection = 'A_TO_B' | 'B_TO_A' | 'SKY_TO_NATAL';
export type DeclinationContactId = 'PARALLEL' | 'CONTRA_PARALLEL';
export interface DeclinationPoint {
  readonly name: string;
  readonly declinationDeg: number;
}
export interface DeclinationContactDefinition {
  readonly id: DeclinationContactId;
  readonly maxOrbDeg: number;
}
export interface DeclinationContactOptions {
  readonly direction: DeclinationDirection;
  readonly sourcePoints: readonly DeclinationPoint[];
  readonly targetPoints: readonly DeclinationPoint[];
  readonly contactDefinitions: readonly DeclinationContactDefinition[];
}
export interface DeclinationContact {
  readonly direction: DeclinationDirection;
  readonly source: Readonly<DeclinationPoint>;
  readonly target: Readonly<DeclinationPoint>;
  readonly contactId: DeclinationContactId;
  /** source - target for PARALLEL; source + target for CONTRA_PARALLEL. */
  readonly signedOffsetDeg: number;
  readonly absoluteOrbDeg: number;
  readonly configuredMaxOrbDeg: number;
}
export interface DeclinationContactsResult {
  readonly contract: 'DeclinationContactsResult';
  readonly methodVersion: 'DECLINATION_CONTACTS_V1';
  readonly direction: DeclinationDirection;
  readonly sourcePointCount: number;
  readonly targetPointCount: number;
  readonly contactDefinitions: readonly Readonly<DeclinationContactDefinition>[];
  readonly contacts: readonly DeclinationContact[];
}
export declare function calculateDeclinationContacts(options: DeclinationContactOptions): DeclinationContactsResult;
