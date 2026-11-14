import type {
  DeclinationContactDefinition,
  DeclinationContactsResult,
  DeclinationDirection,
  DeclinationPoint,
} from './declination-contacts.mjs';

/** A caller assertion, NOT verified independently against an ephemeris. */
export interface DeclinationSourceProvenance {
  readonly providerId: 'VIRGOSTARS_EPHEMERIS';
  readonly engineVersion: string;
  readonly kernelSetId: string;
  readonly timeModelId: string;
}
export type DeclinationCoordinateContext =
  | {
      readonly origin: 'EARTH_GEOCENTER';
      readonly kind: 'EQUATORIAL_DECLINATION';
      readonly frame: 'ICRS';
      readonly frameEpochUtc: null;
      readonly corrections: 'GEOMETRIC' | 'APPARENT';
    }
  | {
      readonly origin: 'EARTH_GEOCENTER';
      readonly kind: 'EQUATORIAL_DECLINATION';
      readonly frame: 'TRUE_EQUATOR_OF_DATE';
      /** Must be identical to the snapshot's datetimeUtc. */
      readonly frameEpochUtc: string;
      readonly corrections: 'GEOMETRIC' | 'APPARENT';
    };
export interface DeclinationSnapshot {
  readonly snapshotId: string;
  readonly datetimeUtc: string;
  readonly coordinates: DeclinationCoordinateContext;
  readonly provenance: DeclinationSourceProvenance;
  readonly points: readonly DeclinationPoint[];
}
export interface SourcedDeclinationContactOptions {
  readonly direction: DeclinationDirection;
  readonly sourceSnapshot: DeclinationSnapshot;
  readonly targetSnapshot: DeclinationSnapshot;
  readonly contactDefinitions: readonly DeclinationContactDefinition[];
}
export interface DeclinationSnapshotContext {
  readonly snapshotId: string;
  readonly datetimeUtc: string;
  readonly coordinates: Readonly<DeclinationCoordinateContext>;
  readonly provenance: Readonly<DeclinationSourceProvenance>;
}
export interface SourcedDeclinationContactsResult {
  readonly contract: 'SourcedDeclinationContactsResult';
  readonly methodVersion: 'SOURCED_DECLINATION_CONTACTS_V1';
  readonly sourceContext: DeclinationSnapshotContext;
  readonly targetContext: DeclinationSnapshotContext;
  readonly facts: DeclinationContactsResult;
}
export declare function calculateSourcedDeclinationContacts(
  options: SourcedDeclinationContactOptions,
): SourcedDeclinationContactsResult;
