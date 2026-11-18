/**
 * Offline, deterministic human-review checklist for a real native 7×23 grid.
 * This is a triage aid, NOT an expected-availability oracle. Every method
 * still requires its own independent scientific reference.
 */
import {ASTRO_COM_HOUSE_SYSTEM_IDS} from '../src/astro-com-house-selector.mjs';
import {LATITUDE_AUDIT_CASES} from './audit-native-house-latitudes.mjs';
import {auditNativeHouseAngleOrientation} from './audit-native-house-angle-orientation.mjs';
import {diffNativeHouseLatitudes} from './diff-native-house-latitudes.mjs';

const METHODS = ASTRO_COM_HOUSE_SYSTEM_IDS.filter(name => name !== 'SUNSHINE');

function priority(row) {
  if (row.transition === 'SUCCESS_TO_ERROR') return 'P0_NEW_METHOD_FAILURE';
  if (row.transition === 'BOTH_ERRORED' &&
      row.previousErrorCode !== row.newErrorCode) return 'P1_CHANGED_ERROR_CODE';
  if (row.transition === 'BOTH_ERRORED') return 'P1_PERSISTENT_METHOD_FAILURE';
  if (row.transition === 'ERROR_TO_SUCCESS') return 'P2_RECOVERED_METHOD';
  if (row.changedCusps > 0) return 'P3_CHANGED_NUMERIC_CUSPS';
  return 'P4_STILL_REQUIRES_INDEPENDENT_REFERENCE';
}

export function buildNativeHouseMethodReviewQueue(before, after) {
  const versionDiff = diffNativeHouseLatitudes(before, after);
  const orientation = auditNativeHouseAngleOrientation(after);
  const angles = orientation.scenarios.map(row => Object.freeze({
    id: row.id, latitudeDeg: row.latitudeDeg, analyticHorizonStatus: row.status,
    triage: row.status === 'RISING_BRANCH' ? 'INDEPENDENT_ANGLES_REFERENCE_NEEDED'
      : 'P0_ASCENDANT_OR_SOURCE_ANGLES_REVIEW',
    requiredEvidence: 'INDEPENDENT_ANGLES_REFERENCE',
    reviewStatus: 'PENDING_INDEPENDENT_REVIEW',
  }));
  const methods = versionDiff.scenarios.flatMap((scenario, i) => {
    const current = after.scenarios[i];
    const resultByMethod = new Map(current.results.map(row => [row.houseSystem, row]));
    const errorByMethod = new Map(current.failures.map(row => [row.houseSystem, row]));
    return scenario.methods.map(row => Object.freeze({
      id: scenario.id, latitudeDeg: scenario.latitudeDeg,
      houseSystem: row.houseSystem,
      transition: row.transition,
      triage: priority(row),
      currentOutcome: resultByMethod.has(row.houseSystem) ? 'RETURNED_VALUES' : 'ERROR',
      currentErrorCode: errorByMethod.get(row.houseSystem)?.code ?? null,
      previousErrorCode: row.previousErrorCode ?? null,
      changedCusps: row.changedCusps ?? null,
      maxCuspDeltaArcsec: row.maxCuspDeltaArcsec ?? null,
      requiredEvidence: resultByMethod.has(row.houseSystem)
        ? 'INDEPENDENT_METHOD_NUMERIC_REFERENCE'
        : 'INDEPENDENT_METHOD_AVAILABILITY_REFERENCE',
      reviewStatus: 'PENDING_INDEPENDENT_REVIEW',
    }));
  });
  const priorities = Object.fromEntries([
    'P0_NEW_METHOD_FAILURE', 'P1_CHANGED_ERROR_CODE',
    'P1_PERSISTENT_METHOD_FAILURE', 'P2_RECOVERED_METHOD',
    'P3_CHANGED_NUMERIC_CUSPS', 'P4_STILL_REQUIRES_INDEPENDENT_REFERENCE',
  ].map(name => [name, methods.filter(row => row.triage === name).length]));
  return Object.freeze({
    contract: 'VirgoStarsNativeHouseMethodReviewQueueV1',
    status: 'HUMAN_SCIENTIFIC_REVIEW_REQUIRED_NOT_CERTIFIED',
    scientificallyCertified: false,
    polarMethodAvailabilityIndependentlyVerified: false,
    independentMethodReferencesSupplied: 0,
    independentAngleReferencesSupplied: 0,
    beforeSourceCommitSha: before.ephemeris.upstreamCommitSha,
    afterSourceCommitSha: after.ephemeris.upstreamCommitSha,
    attempted: METHODS.length * LATITUDE_AUDIT_CASES.length,
    missingIndependentMethodReferences: methods.length,
    missingIndependentAngleReferences: angles.length,
    currentMethodFailures: after.failed,
    newMethodFailures: versionDiff.successToError,
    recoveredMethods: versionDiff.errorToSuccess,
    flaggedAscendantBranches: orientation.flagged,
    priorities,
    angles,
    methods,
    note: 'Priorities describe observed changes, not scientifically expected success or failure. All 161 method outcomes and 7 angle sets need independent review.',
  });
}
