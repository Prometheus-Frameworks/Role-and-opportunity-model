import type { PlayerRoleProfile } from './playerRole.ts';
import type { TeamOpportunityContext } from './teamOpportunity.ts';

export interface NamedScenario {
  scenarioId: string;
  scenarioName: string;
  profile: PlayerRoleProfile;
  context: TeamOpportunityContext;
}

export interface ScenarioSummary {
  scenarioId: string;
  scenarioName: string;
  playerName: string;
  position: PlayerRoleProfile['position'];
  summary: string;
}
