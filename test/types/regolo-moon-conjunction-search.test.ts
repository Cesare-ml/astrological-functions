import {searchRegoloPrecedingConjunction} from
  'astrological-functions/regolo-moon-conjunction-search';
import type {RegoloPrecedingConjunctionSearchInput} from
  'astrological-functions/regolo-moon-conjunction-search';

declare const input: RegoloPrecedingConjunctionSearchInput;
const result = searchRegoloPrecedingConjunction(input);

const status: 'CANDIDATE_UNVERIFIED_ASTRONOMY' | 'NO_CONJUNCTION_BRACKET' |
  'NON_CONVERGENT' = result.status;
const availability: 'UNAVAILABLE' = result.precedingNewMoon.availability;
const jd: number | undefined = result.candidate?.jdUt;
void [status, availability, jd];

// @ts-expect-error the preceding conjunction finder cannot certify a Regolo Moon
const incorrectAvailability: 'AVAILABLE' = result.precedingNewMoon.availability;
void incorrectAvailability;

// @ts-expect-error Moon source metadata must be explicit
searchRegoloPrecedingConjunction({datetimeUtc: '2026-11-18T12:00:00Z'});
