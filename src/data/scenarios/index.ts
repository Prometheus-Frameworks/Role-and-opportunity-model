import { alphaWrRole } from './alphaWrRole.ts';
import { crowdedRoomRole } from './crowdedRoomRole.ts';
import { slotWrRole } from './slotWrRole.ts';
import { tePrimaryRole } from './tePrimaryRole.ts';
import type { ScenarioSummary } from '../../types/scenario.ts';

export const seededScenarios = [alphaWrRole, slotWrRole, tePrimaryRole, crowdedRoomRole];

export const getScenarioById = (scenarioId: string) =>
  seededScenarios.find((scenario) => scenario.scenarioId === scenarioId);

export const scenarioSummaries: ScenarioSummary[] = seededScenarios.map((scenario) => ({
  scenarioId: scenario.scenarioId,
  scenarioName: scenario.scenarioName,
  playerName: scenario.profile.playerName,
  position: scenario.profile.position,
  summary: `${scenario.profile.playerName} profiles as a ${scenario.scenarioName.toLowerCase()} for ${scenario.context.teamName}.`,
}));
