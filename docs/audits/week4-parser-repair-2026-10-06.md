# Week 4 strict-parser comparison repair

The reviewed producer at `856263f3e06dca436b72345a38b13d411b78376e` rejects an otherwise matching Week 4 build witness when `allocationEvidenceIdentity` passes the strict JSON decoder's null-prototype objects into `assertWeek4EvidenceSemantics`. `isDeepStrictEqual` distinguishes those objects from the ordinary objects in the pinned binding. The same defect affects embedded receipt comparisons.

This repair compares canonical JSON contents using the existing JCS implementation. Raw byte pin authentication, strict duplicate-key decoding, exact member/value equality, clocks, source admission and purpose gates remain intact. Two regression tests reproduce the parser mismatch and verify that mutated inventory members and receipts still fail.

Validation: both new regressions failed before the repair; all 324 tests and focused strict TypeScript checks pass after it. Tests use metadata/fictional fixtures and do not invoke the retained real-input producer.

This changed producer has not received independent review or a new exact-head execution decision. The prior review and bounded run authorization name the previous head and must not be treated as approval of this repair. Do not promote readiness or rerun the retained Week 4 inputs from this head until that review and decision are recorded.
