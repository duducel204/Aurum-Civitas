/** AC-RS2 -> AC-M2 -> code/test/evidence verification; no LLM/network calls. */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fixture, finish, roads } from "../tests/aurum/fixture.ts";
import { record, replay, hash } from "../lib/aurum/replay.ts";
import { judge } from "../lib/aurum/judge.ts";
import { checkConservation } from "../lib/aurum/economy.ts";
import { canonical } from "../lib/aurum/rules.ts";
const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const sha = (path: string) =>
  createHash("sha256").update(read(path)).digest("hex");
const seed = JSON.parse(read("projection/repository_seed.json"));
const manifest = JSON.parse(read("projection/repository_manifest.json"));
const files = readdirSync(resolve(root, "tests/aurum"))
  .filter((n) => n.endsWith(".test.ts"))
  .sort()
  .map((n) => "tests/aurum/" + n);
const tests = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--test", "--test-reporter=tap", ...files],
  { cwd: root, encoding: "utf8" },
);
mkdirSync(resolve(root, "evidence"), { recursive: true });
writeFileSync(resolve(root, "evidence/tests.tap"), tests.stdout + tests.stderr);
if (tests.status !== 0) throw Error("Tests failed: see evidence/tests.tap");
const f = fixture(),
  direct = finish(f.state, f.rules),
  connected = finish(f.state, f.rules, roads());
if (
  !direct.s.completed ||
  !connected.s.completed ||
  !checkConservation(connected.s) ||
  connected.s.tick >= direct.s.tick
)
  throw Error(
    "Predicted physical road advantage/conservation did not hold in fixture",
  );
const trace = await record(f.state, f.rules, connected.streams);
const restored = await replay(trace);
const identical = await record(f.state, f.rules, connected.streams);
if (
  canonical(trace) !== canonical(identical) ||
  (await hash(restored)) !== (await hash(connected.s))
)
  throw Error("Exact replay/reproducibility failed");
const verdict = await judge(trace);
if (verdict.status !== "VERIFIED")
  throw Error("Independent mission derivation rejected");
writeFileSync(
  resolve(root, "evidence/economic-replay.json"),
  JSON.stringify({ trace, verdict }, null, 2) + "\n",
);
const coverage = [];
for (const binding of manifest.bindings) {
  const seedModule = seed.modules.find(
    (m: { id: string }) => m.id === binding.module_id,
  );
  if (!seedModule) throw Error("Missing Seed ID");
  const runtime = await import(
    pathToFileURL(resolve(root, binding.implementation)).href
  );
  if (runtime.semanticId !== seedModule.id)
    throw Error("Runtime ID does not match Seed");
  const code = read(binding.implementation),
    test = read(binding.test_path),
    mission = JSON.parse(read(binding.mission_path));
  if (
    !code.includes(seedModule.id) ||
    !test.includes(binding.test_id) ||
    !test.includes(seedModule.id) ||
    mission.id !== binding.mission_id ||
    mission.module_id !== seedModule.id ||
    canonical(mission.requires) !== canonical(seedModule.requires) ||
    mission.acceptance !== seedModule.mission.acceptance
  )
    throw Error("Round-trip traceability failure: " + seedModule.id);
  const passed = tests.stdout
    .split("\n")
    .filter((l: string) => /^ok \d+ - /.test(l) && l.includes(binding.test_id));
  if (!passed.length) throw Error("No executed pass for " + binding.test_id);
  mkdirSync(resolve(root, binding.evidence_path), { recursive: true });
  const entry = {
    id: binding.test_id,
    semantic_id: seedModule.id,
    capability: seedModule.capability,
    mission_id: mission.id,
    status: "CONFIGURED_CONTRACT_TESTED",
    seed_sha256: sha("projection/repository_seed.json"),
    code_path: binding.implementation,
    code_sha256: sha(binding.implementation),
    test_path: binding.test_path,
    test_sha256: sha(binding.test_path),
    mission_path: binding.mission_path,
    mission_sha256: sha(binding.mission_path),
    passed_tests: passed,
    test_output: "evidence/tests.tap",
    test_output_sha256: sha("evidence/tests.tap"),
    evidence_guard:
      "Fixture/module-level behavior; does not certify absent production bindings, full game integration or empirical engagement.",
  };
  writeFileSync(
    resolve(root, binding.evidence_path, "result.json"),
    JSON.stringify(entry, null, 2) + "\n",
  );
  coverage.push(entry);
}
const result = {
  id: "AC-MV2",
  seed_id: seed.id,
  seed_sha256: sha("projection/repository_seed.json"),
  manifest_sha256: sha("projection/repository_manifest.json"),
  node: process.version,
  test_exit_code: tests.status,
  module_count: coverage.length,
  test_count: Number(tests.stdout.match(/# tests (\d+)/)?.[1]),
  id_roundtrip: true,
  deterministic_rerun: true,
  predicted_vs_observed: {
    conservation: true,
    connected_road_faster: true,
    direct_ticks: direct.s.tick,
    road_ticks: connected.s.tick,
    replay_exact: true,
    final_hash: trace.finalHash,
  },
  coverage: coverage.map((e) => ({
    module_id: e.semantic_id,
    test: e.id,
    mission: e.mission_id,
    evidence: `evidence/${e.id}/result.json`,
  })),
  pending: [
    "Canonical numeric balance/recipes/bootstrap/era/title rules",
    "Real authentication and independent review authorization provider",
    "Durable production persistence and network transport",
    "Full integration of region/ecology/world/contribution services into shared gameplay UI",
    "Long-horizon live-player sustainability and engagement",
    "External regional data demand ACE",
    "Useful structural novelty GF",
    "Tests use trusted fixture identity/evidence callbacks, not real service authentication",
  ],
};
writeFileSync(
  resolve(root, "evidence/materialization.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result, null, 2));
