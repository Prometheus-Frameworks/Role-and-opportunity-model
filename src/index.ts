import { alphaWrRole } from './data/scenarios/alphaWrRole.ts';
import { crowdedRoomRole } from './data/scenarios/crowdedRoomRole.ts';
import { slotWrRole } from './data/scenarios/slotWrRole.ts';
import { tePrimaryRole } from './data/scenarios/tePrimaryRole.ts';
import { evaluateRoleProfile } from './scoring/evaluateRoleProfile.ts';

const scenarios = [alphaWrRole, slotWrRole, tePrimaryRole, crowdedRoomRole];

for (const scenario of scenarios) {
  const result = evaluateRoleProfile(scenario);

  console.log(`\n=== ${result.scenarioName} ===`);
  console.log(`Player: ${result.profile.playerName} (${result.profile.position})`);
  console.log(`Role archetype: ${result.roleArchetype}`);
  console.log(`Role value score: ${result.scores.roleValue}`);
  console.log(`Opportunity quality score: ${result.scores.opportunityQuality}`);
  console.log(`Role stability score: ${result.scores.roleStability}`);
  console.log(`Vacated opportunity score: ${result.scores.vacatedOpportunity}`);
  console.log(`Composite role profile score: ${result.compositeScore}`);
  console.log('Explanation bullets:');

  for (const bullet of result.explanationBullets) {
    console.log(`- ${bullet}`);
  }
}
