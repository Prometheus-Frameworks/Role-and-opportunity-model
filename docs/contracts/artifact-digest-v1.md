# Artifact digest/reference profile v1 — bounded Slice 1 repair

This document replaces the earlier unversioned bespoke proposal. Implementation is
`src/contracts/artifactDigestV1.ts`; it accepts injected values/bytes only. No source
adapter, runner, fetch, file acquisition, role builder or admission operation is added.

## Explicit reference semantics

Every `ArtifactRef` requires `artifactId`, `revision`, `sha256`, `artifactType`,
`digestProfile` and `generatedAt`. SHA-256 is 64 lowercase hexadecimal characters.
`generatedAt` is generation of the retained artifact revision, not football event,
publication, retrieval or evidence-cutoff time. Unknown football/source clocks remain
nullable in the evidence wrapper; do not fill them from artifact clocks.

| artifactType | Required digestProfile | What sha256 binds |
|---|---|---|
| player_team_allocation_handoff_v1 | tiber-jcs-root-sha256-v1 | Projected canonical contract content |
| weekly_role_state_v1 | tiber-jcs-root-sha256-v1 | Projected canonical contract content |
| evidence_file | raw-bytes-sha256-v1 | Exactly retained bytes, including JSON formatting if applicable |
| teamstate_context | raw-bytes-sha256-v1 | Exactly retained existing Teamstate artifact bytes |

Unknown types/profiles or wrong pairings fail. A verifier never guesses from a filename,
MIME type or hash. The Teamstate raw-byte choice does not redefine its own contract.
Future types/profiles require review. Correction references keep logical ID, type and
profile, and require a different revision/hash with non-future generation.

New contract files also need **separate raw-byte transport pins**, stored outside the
content being hashed (e.g. the review/binding manifest's path, byte length and raw-byte
SHA-256). Embedding a file's raw-byte hash inside itself would reintroduce self-reference.
The content profile does not replace transport integrity. This slice's packet manifest
uses raw-byte hashes. Runtime source-byte/receipt authentication remains outside scope.

## Content profile: tiber-jcs-root-sha256-v1

1. Decode supplied bytes as strict UTF-8. Reject invalid UTF-8 and a leading BOM.
2. Parse the JSON grammar, rejecting duplicate **decoded** object names at every depth
   before object construction can discard a duplicate. `a` and `\u0061` are the same key.
3. Require valid Unicode (no unpaired UTF-16 surrogates), finite IEEE-754 binary64 JSON
   numbers, and ordinary JSON values. No NaN, infinities, bigint, undefined, sparse arrays,
   custom object prototypes, getters/setters, hidden object fields, symbols or cyclic JS
   object graphs enter the canonicalizer. Object APIs cannot recover duplicates erased by
   another parser: externally supplied bytes must use `parseJcsJson`/`contractContentSha256`.
4. Require the supported contract header, matching own artifact type/profile/generation,
   and the declared artifact graph described below.
5. Copy the parsed object and remove **only** the member at root `artifact.sha256`.
   All nested dependency hashes, reference metadata, arrays and other fields remain.
6. Canonicalize that projected JSON value under RFC 8785/JCS: UTF-16 code-unit key order,
   no whitespace, ECMAScript primitive serialization and preserved array order. The
   encoder emits sorted keys directly, avoiding numeric-key reordering by JS objects.
7. SHA-256 the UTF-8 canonical bytes; return lowercase hexadecimal.

The projection is TIBER-specific and versioned; the subsequent canonical JSON encoding
uses JCS. It is not claimed that the unprojected file's bytes are JCS or equal to its
content digest. The utility computes the digest; comparison with an expected declared
digest is the caller's responsibility. A successful hash is not semantic validation,
source qualification, provenance authentication, correction finality or purpose admission.

The admissible number model is binary64, including the standard parsing/rounding behavior;
this is not arbitrary-precision decimal preservation. Role counts separately require safe
nonnegative integers. Numbers outside finite binary64 are rejected. Negative zero emits
`0`; different lexical spellings of the same parsed number canonicalize identically.
String data is not Unicode-normalized: composed/decomposed spellings remain distinct.
Equivalent escaped/unescaped spellings of the same string canonicalize identically.

## Declared artifact-digest graph

`ArtifactNode = { artifact: ArtifactRef, dependencies: ArtifactRef[] }`.
`validateArtifactGraph(nodes)` requires a closed declared graph: every dependency resolves
to one node with the exact same reference metadata. Identity is `(artifactId, revision)`;
changing the hash/type/profile cannot evade a self-reference or conflicting-revision check.
Duplicate nodes/edges, missing/conflicting references, same-revision self-reference,
dependency cycles and future-generated dependencies fail. Equal generation is valid.

`contractContentSha256(bytes, graph)` requires the graph root to match the supplied own
reference and its direct dependencies to match the complete set of embedded typed
references outside root `artifact`. Repeated identical references are deduplicated as
edges; conflicting copies fail. Nested hashes stay binding. Root-hash projection does
not exempt a nested reference back to the same revision.

The graph is a **declaration**, not proof about unprovided external bytes. This function
checks the root's references against its bytes and the whole supplied graph for closure,
chronology and cycles. A later byte-binding step must verify every upstream canonical
node against that node's bytes/dependencies and verify raw-file leaves against bytes;
it must not assume an uninspected upstream contract has no dependencies. No such upstream
resolver or adapter is implemented here.

The Role State/handoff validators additionally check all references present in their
objects, plus known derived-artifact parent, Teamstate/input and prior-state/input edges.
The enclosing state validator composes the current/prior supplied contracts and optional
typed `suppliedArtifacts` nodes before acceptance; same-revision metadata and all known
cross-object edges must agree. Unprovided referenced revisions are represented as
deferred leaves in this **local** check. The standalone `validateArtifactGraph` remains a
closed declared-graph utility with no missing nodes allowed. Neither operation proves
external upstream bytes or completeness of unavailable dependencies. Evidence-ID
lineage cycles and artifact-digest cycles are separate checks. Same-file field lineage
can refer to another evidence record from the same already-retained external file;
that does not place the file's own hash inside itself. References from the containing
contract to its own revision remain forbidden.

All exact artifact edges must satisfy `dependency.generatedAt <= dependent.generatedAt`.
UTC timestamps preserve arbitrary fractional precision; ordering does not truncate to
milliseconds. Evidence wrappers also cannot predate the artifacts/parent evidence they
incorporate. A supplied artifact header and the corresponding reference must agree.

## API and validation boundaries

| API | Scope |
|---|---|
| parseJcsJson(Uint8Array) | Strict byte decoding, JSON grammar, duplicate-key and admissible-input checks |
| canonicalizeJcs(unknown) | Canonical serialization of already decoded admissible values |
| rawByteSha256(Uint8Array) | Exact raw-byte digest; intentionally does not parse or normalize |
| validateArtifactReference(ArtifactRef) | Reference type/profile and identity/hash/clock consistency |
| validateArtifactGraph(ArtifactNode[]) | Closed declared graph consistency and chronology |
| contractContentSha256(Uint8Array, ArtifactNode[]) | Root projection, typed-reference matching, declared graph and content hashing |

The graph/reference helper APIs take the documented typed records. The byte API is the
strict decoding entry point; rawByteSha256 deliberately accepts any bytes. The existing
role validators still require both their closed schema and relational checks. Structural
JSON Schema cannot enforce duplicate-key rejection after parsing, valid Unicode scalar
sequences, hash computation or cross-object relations on its own.

## Conformance and independent implementation

`tests/fixtures/digest/jcs-vectors.json` provides exact input JSON and expected canonical
text/rejection, including numeric-looking/non-BMP keys, Unicode spellings, lone surrogates,
escaped duplicate keys, exponent/subnormal/max-double boundaries, negative zero and arrays.
`tests/artifactDigestV1.test.ts` additionally tests root projection, nested hashes, raw-byte
distinction, same-revision references, artifact cycles, missing graph edges and invalid
JS input. `tests/weeklyRoleStateV1Repairs.test.ts` exercises contracts with these references.

The repair packet records independent Python `rfc8785==0.1.4` results against the same
vectors, using an independent duplicate-key rejecting decoder. Package installation is
outside this repository; no package.json/lock or runtime dependency changed. This is a
cross-runtime conformance check, not a claim that all possible inputs have been exhaustively
tested. Node's built-in number/string primitive serialization supplies the ECMAScript
operations; no alternate hand-written float formatter is introduced.

Normative canonicalization reference: [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785).
Profile/version and reference semantics above are part of the proposed TIBER contract.
