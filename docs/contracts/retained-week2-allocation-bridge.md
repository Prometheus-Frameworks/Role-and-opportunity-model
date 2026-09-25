# Retained Week 2 allocation bridge — interface qualification only

This bounded extension starts at ROP `131ff54ff7b44851fdb3584ba903fd34741cd086`.
It produces a pending-purpose PlayerTeamAllocationHandoffV1 plus the mandatory
pinned companion. It does not execute WeeklyRoleStateV1, admit a source, accept
a purpose, compare players/weeks, score, forecast, activate a consumer or fetch data.

## Closed selection and compatibility

`adaptReviewedAllocation(bytes, outputIdentity, { season: 2026, seasonType: 'REG', week: 1 | 2 })`
selects one of two deep-frozen reviewed bindings. All other scopes, extra selection
fields and caller-provided source pins are rejected. It has no filesystem,
network, provider or current-pointer access. Caller bytes must match every pin.
Extra map entries are ignored and cannot enter evidence or the companion.

`adaptRetainedWeek1` remains the original public entry and delegates to the Week 1
selection. Its binding file is unchanged. For identical bytes/output identity,
the complete handoff, companion bytes and pins match the exact base byte-for-byte.
The shared allocation logic consumes the selected scope; there is no duplicated
Week 2 interpretation or Data producer. Synthetic injection remains fixture-only,
even when its supplied references resemble real evidence.

## Exact Week 2 binding and acquisition boundary

- Data base: `e1e92078c626b9e2e502e927ba0de79afd26f451`.
- Local retained support: `426655473c53ba347a99ce2914cd5c9e7a7fbec1`.
- Reviewed Data ZIP SHA-256: `5ec880f0d553c23b8ad9322bf0890286c8440a9b19a1a117d1a4bc2941737823`.
- Candidate: `exports/candidates/weekly_boxscore/revisions/2026_REG_w02/3c7cd5d0bfaeb52363cf30fa2387ce024b78070dc2ad51a2b2f77ee2efa44ef9.json`.
- Candidate SHA-256: `3c7cd5d0bfaeb52363cf30fa2387ce024b78070dc2ad51a2b2f77ee2efa44ef9`; 1,332,388 bytes.
- Support bundle SHA-256: `0a9738d83b7c968f9b6de8f83c848ad422dc0ea1d0519ba14bae0858fe673f0f`.

`retainedWeek2Binding.ts` lists 18 required exact raw-byte pins: seven source/
schedule/license files, four unchanged Data producer/intake scripts, candidate
and inventory, build receipt, support bundle, original packet manifest, and two
independent Data review records. Unlike Week 1's historical audit files, Week 2
uses its own exact manifest, bundle and build receipt. Pin count is not a generic
readiness rule: the explicit reviewed list determines requirements.

Files under the reviewed packet's `retained/` directory retain repository-relative
map keys. Build receipt, bundle and manifest use `data-packet/` keys; external
Data review records use `reviews/` keys. These aliases change no retained bytes.
The ZIP digest is an immutable retrieval reference, not a claim that the adapter
opens or authenticates a ZIP. It authenticates every required injected member
against hardcoded pins. The bundle is verified as bytes, not executed as Git.
Manifest references to other unsupplied files are not transitively authenticated.
The prior Data review supplies exact base/support qualification; this bridge
does not claim fresh external/provider authentication or independent football truth.

## Preserved Data semantics

All 1,107 observations are represented before position filtering: 1,106 identified
and one unresolved BUF observation; 32 reciprocal teams; 16 matched games.
Identified positions include QB 39, RB 95, WR 152, TE 73 and 747 other rows,
including 95 SAF. Blank source-native ID/position are retained in companion raw
identity; the handoff expresses unresolved identity/null position. No name join,
canonical identity admission, current-roster rewrite or absent-player zero exists.

All four core reconciliations match across 32 teams. Carry denominators retain
QB/OTHER work; credited targets are not attempts, and attempts are not dropbacks.
Data-supplied share numerator, denominator, value, status and reason are validated
and copied. The existing nullable scalar carries_plus_targets is preserved.
Validation arithmetic checks Data assertions; it does not replace the supplied
objects or introduce a weighted opportunity definition. Unknown/conflicted
reconciliation never manufactures a numeric residual.

The full candidate envelope, all 25 observed fields, limitations, unavailable
fields, population and 22 receiving-air-yard conflicts remain in the companion.
Vendor fantasy columns exist only in pinned indivisible transport bytes and do
not become ROP observations. Only the selected week enters the handoff. No other
week is qualified by transport presence. Native SAF remains SAF, so conservative
RB-room qualification remains unchanged.

## Clocks, rights and lifecycle

Week 2's generation witness is the pinned build receipt's `build_completed_at`,
`2026-09-25T12:01:50.547930Z`. The adapter additionally checks witness base/support,
candidate digest, build ordering, unadmitted state and null cutoff against the
binding. Changing the witness or substituting a Week 1 receipt fails closed.
Publication/release, retrieval, source compilation, candidate build and adapter
generation clocks remain distinct; fractional chronology is retained.

Finality remains unknown, correction open/provisional, evidence cutoff null.
The existing pinned nflverse contributors / CC BY 4.0 attribution remains in
both source receipts and complete source envelope. No rights grant or source
admission is created. Both outer and nested candidate lifecycle must remain
candidate_needs_review and consumer_admitted=false. The generated handoff's
purpose is pending, with no accepted purposes or acceptance evidence.

## Companion and downstream gates

The handoff alone omits Data-derived objects and source envelope details. Its
exact reference is inside the mandatory raw-byte-pinned companion. Any later
state output must retain the state builder's companion/support binding alongside
the state. Existing Slice 3 validation remains unchanged: candidate-pin lineage,
valid unique support pins and outer/nested lifecycle checks continue to apply.
This extension neither invokes nor weakens that builder. Unsupplied upstream
bytes still require separate authentication at a future integration boundary.

Week 1 and Week 2 have unchanged Data field, denominator, identity and producer
definitions. Native position-population differences are preserved. This is only
definitional compatibility, not a player continuity or Role State comparison.

Remaining gates: independent exact-packet interface review, durable implementation
review/materialization, and separate explicit Week 2 ROP-purpose acceptance before
real-player execution. No shared-contract or companion redesign is proposed.
