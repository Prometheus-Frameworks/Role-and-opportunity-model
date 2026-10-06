# Week 4 schedule-order repair

The reviewed parser repair at `c871cd01ffbd28d38f9a08a063314371c8aad268` passes its metadata checks but the retained adapter rejects schedule membership. The adapter sorts game records using `localeCompare`, while the binding and coverage use JavaScript's default code-unit sort. Prefix team codes such as LA/LAC expose different underscore-versus-letter collation, despite identical game membership.

Replace only the game-record comparator with code-unit ordering. Membership, scope, duplicate-game contract validation, native game/team identity, source authentication and population/denominator checks remain required. A fictional AAA/AAAC schedule regression reproduces the original gate failure, verifies correct coverage after the fix, and still rejects changed membership. No retained NFL inputs are executed by this test.

Validation: the new regression fails on the previous code; all 325 tests pass after the repair. Focused strict source compilation passes on TypeScript 5.9.2. Including the existing allocation test file in strict compilation exposes its pre-existing nullable-value type error in the invalid-selector test, outside this repair.

The previous exact-head review and execution acceptance name `c871cd01ffbd28d38f9a08a063314371c8aad268`. This changed producer requires fresh exact-head review and a corresponding operator decision before retained-input execution. No retry, source admission, accepted-readiness promotion, merge, Site activation, transaction, schedule or Forecast change is part of this repair.
