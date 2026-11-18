import {inspectRegoloRecordedNewMoon} from
  'astrological-functions/regolo-moon-event-candidate';
import type {RegoloRecordedMoonCandidateInput} from
  'astrological-functions/regolo-moon-event-candidate';

declare const input: RegoloRecordedMoonCandidateInput;
const result = inspectRegoloRecordedNewMoon(input);
const availability: 'UNAVAILABLE' = result.precedingNewMoon.availability;
const stage: string = result.status;
const provenance: 'UNREVIEWED_P0_ARCHIVE_AND_INJECTED_ENGINE' = result.scientificEvidence;
void [availability, stage, provenance];
