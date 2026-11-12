import { calculateTransitToNatal, type TransitChartSnapshot, type TransitAspectDefinition } from '../../src/transit-to-natal.mjs';
declare const natalChart: TransitChartSnapshot;
declare const skyChart: TransitChartSnapshot;
declare const defs: readonly TransitAspectDefinition[];
const facts = calculateTransitToNatal({ natalChart, skyChart, birthTimeKnown: true,
  natalBodyNames: ['Sun'], skyBodyNames: ['Mars'], aspectDefinitions: defs });
const direction: 'SKY_TO_NATAL' = facts.direction;
const noHouses: null = facts.houses;
const onlyKnown: true = facts.birthTimeKnown;
void [direction, noHouses, onlyKnown];
// @ts-expect-error - missing explicit known-birth-time gate
calculateTransitToNatal({ natalChart, skyChart, natalBodyNames: ['Sun'], skyBodyNames: ['Mars'], aspectDefinitions: defs });
// @ts-expect-error - no implicit or missing aspect configuration
calculateTransitToNatal({ natalChart, skyChart, birthTimeKnown: true, natalBodyNames: ['Sun'], skyBodyNames: ['Mars'] });
