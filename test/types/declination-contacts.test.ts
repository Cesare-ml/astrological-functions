import { calculateDeclinationContacts } from '../../src/declination-contacts.mjs';
import type { DeclinationContactOptions, DeclinationDirection } from '../../src/declination-contacts.mjs';

const options = {
  direction: 'SKY_TO_NATAL',
  sourcePoints: [{ name: 'Sun', declinationDeg: 5 }],
  targetPoints: [{ name: 'Moon', declinationDeg: -5 }],
  contactDefinitions: [{ id: 'CONTRA_PARALLEL', maxOrbDeg: 1 }],
} as const satisfies DeclinationContactOptions;
const facts = calculateDeclinationContacts(options);
const direction: DeclinationDirection = facts.direction;
const contactId: 'PARALLEL' | 'CONTRA_PARALLEL' | undefined = facts.contacts[0]?.contactId;
void direction;
void contactId;

// @ts-expect-error unknown directions must be rejected at compile time
calculateDeclinationContacts({ ...options, direction: 'NATAL_TO_SKY' });
// @ts-expect-error unknown contact methods must be rejected at compile time
calculateDeclinationContacts({ ...options, contactDefinitions: [{ id: 'SQUARE', maxOrbDeg: 1 }] });
// @ts-expect-error readonly result cannot be modified by a typed caller
facts.contacts.push(facts.contacts[0]!);
