import type { TeamOpportunityContext } from '../types/teamOpportunity.ts';
import { clamp, round, weightedAverage } from '../utils/math.ts';

export const scoreOpportunityQuality = (context: TeamOpportunityContext): number => {
  const score = weightedAverage([
    [context.passRateOverExpected + 50, 0.15],
    [context.neutralPassRate, 0.2],
    [context.redZonePassRate, 0.15],
    [context.paceIndex, 0.1],
    [context.quarterbackStability, 0.15],
    [context.playCallerContinuity, 0.1],
    [100 - context.targetCompetitionIndex, 0.1],
    [context.receiverRoomCertainty, 0.05],
  ]);

  return round(clamp(score));
};
