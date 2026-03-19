import type { PlayerRoleProfile, RoleArchetype } from '../types/playerRole.ts';
import { clamp, round, weightedAverage } from '../utils/math.ts';

export const classifyRoleArchetype = (profile: PlayerRoleProfile): RoleArchetype => {
  if (profile.position === 'TE' && profile.targetShare >= 22 && profile.routeParticipation >= 70) {
    return 'TE1';
  }

  if (profile.position === 'WR' && profile.targetShare >= 26 && profile.firstReadShare >= 28) {
    return 'WR1';
  }

  if (profile.position === 'WR' && profile.slotRate >= 55 && profile.averageDepthOfTarget <= 11) {
    return 'SLOT';
  }

  if (profile.position === 'WR' && profile.averageDepthOfTarget >= 14 && profile.airYardShare >= 28) {
    return 'FIELD_STRETCHER';
  }

  if (profile.personnelVersatility >= 75 && profile.slotRate >= 25 && profile.inlineRate >= 20) {
    return 'HYBRID';
  }

  if (profile.routeParticipation < 60 || profile.targetShare < 16 || profile.competitionForRole >= 65) {
    return 'ROTATIONAL';
  }

  return 'WR2';
};

export const scoreRoleValue = (profile: PlayerRoleProfile): number => {
  const baseScore = weightedAverage([
    [profile.targetShare, 0.3],
    [profile.routeParticipation, 0.2],
    [profile.firstReadShare, 0.2],
    [profile.redZoneTargetShare, 0.1],
    [profile.airYardShare, 0.1],
    [profile.personnelVersatility, 0.1],
  ]);

  const archetype = classifyRoleArchetype(profile);
  const archetypeBonus: Record<RoleArchetype, number> = {
    WR1: 18,
    WR2: 8,
    SLOT: 10,
    FIELD_STRETCHER: 8,
    TE1: 20,
    ROTATIONAL: -4,
    HYBRID: 12,
  };

  return round(clamp(baseScore + archetypeBonus[archetype]));
};
