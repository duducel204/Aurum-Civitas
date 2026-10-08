# Materialization plan — AC-RS2 / AC-M2

Source: repository_seed.json and repository_manifest.json at e78c1aabab206db22070f122ebe70772f50f1038. IDs, module boundaries and dependency relations stay fixed. No new game architecture/provider is selected.

1. Expand RM0 contracts into validated explicit RuleSet and canonical state types.
2. Implement RM1 transition, RM2 accounting, RM3 persistent physical routes and RMD read-only observation.
3. Implement RM4 complete trace/replay and RM5 independently derived mission verdicts.
4. Implement configured RM6/RM7 regional/ecological rules; RM8/RM9 membership and ordered world session, with injected identity and persistence boundaries.
5. Implement RMA/RMB qualified contributions and permanent history; RMC provenance/corrections.
6. Create each RT*/RJ* test/mission binding, run tests, write evidence with source hashes, document mechanics/migration, and compare obligations against outcomes.

Open values are configuration inputs, not silently chosen defaults. A clearly labeled demo/test fixture supplies sample numbers to exercise the engine; it does not amend the canonical Seed. No identity provider, hosted database, multiplayer wire protocol or production hosting is materialized. Local authenticated-principal fixtures cannot certify real authentication or an internet shared world. Historical title/era policies must be supplied by callers.

Execution support files (local HTTP adapter, fixture, test runner, docs and evidence collector) implement already-selected contracts and retain semantic_id metadata. Browser UI invokes the same RM1 transition and observes RMD snapshots. Existing lib/game-engine.ts is retained as a compatibility source; its old animation orchestration is replaced in the UI.

Completion is reported per obligation, separating tested configured behavior from unverified empirical/full-world goals. No full-game certification is claimed from fixture tests.
