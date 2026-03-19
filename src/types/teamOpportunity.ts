export interface TeamOpportunityContext {
  teamId: string;
  teamName: string;
  passRateOverExpected: number;
  neutralPassRate: number;
  redZonePassRate: number;
  paceIndex: number;
  quarterbackStability: number;
  playCallerContinuity: number;
  targetCompetitionIndex: number;
  receiverRoomCertainty: number;
  vacatedTargetShare: number;
}
