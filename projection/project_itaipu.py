"""Calculate the dependency closure with the repository's existing structural solver."""
import itertools
import json
from pathlib import Path
from structural import backward_plans, forward, digest

ROOT = Path(__file__).resolve().parent
model = json.loads((ROOT / "itaipu_seed.json").read_text())
result = backward_plans(model)
targets = set(model["target_facts"])
ids = [op["id"] for op in model["operators"]]
feasible = []
for n in range(1, len(ids) + 1):
    for subset in itertools.combinations(ids, n):
        if targets <= set(forward(model, list(subset))["facts"]):
            feasible.append(set(subset))
oracle = sorted(sorted(p) for p in feasible if not any(q < p for q in feasible))
assert oracle == sorted(p["operators"] for p in result["plans"])
assert all(not p["unresolved_facts"] for p in result["plans"])
assert "IV" not in forward(model, blocked_facts=["IR"])["facts"]
assert "IH" not in forward(model, blocked_facts=["IE"])["facts"]
out = {
    "id": "AC-IP1", "seed_digest": digest(model),
    "status": "CONDITIONAL_ON_EXPLICIT_GAME_PARAMETERS",
    "search": result, "exhaustive_oracle": oracle,
    "challenges": {"no_roads_blocks_end_to_end_proof": True, "no_energy_blocks_housing": True},
    "scope": "Structural closure, not predicted development time or proof of gameplay quality",
}
(ROOT / "itaipu_result.json").write_text(json.dumps(out, indent=2) + "\n")
print(json.dumps({"operators": oracle, "oracle_match": True, "waves": result["plans"][0]["waves"]}))
