/** Fixed Week 4 binding. No generic selector, caller pins, acceptance or provider I/O. */
import { WEEK4_PACKET as B } from './week4PacketBinding.ts';
function freeze<T>(value: T): T {
 if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
 return value;
}
export const RETAINED_WEEK4_BINDING = freeze({
 sourceSupportCommit: B.sourceSupportCommit, candidateGeneratedAt: B.candidateGeneratedAt,
 generationEvidence: B.auditPath + 'build-witness.json#build_completed_at',
 candidateWitness: { path: B.auditPath + 'build-witness.json', inventoryPath: B.auditPath + 'input-inventory.json',
  reviewPath: B.auditPath + 'independent-review.json' },
 games: B.games, paths: B.paths, pins: B.pins
});
