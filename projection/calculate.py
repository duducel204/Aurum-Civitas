"""Aurum actual-state projection; standard library, no model/network calls."""
import itertools
import json
from pathlib import Path
from structural import backward_plans, forward, dependency_impact, digest

ROOT = Path(__file__).resolve().parent
def calculate(model):
    ids = [o["id"] for o in model["operators"]]
    assert len(ids) == len(set(ids))
    facts = set(model["facts"])
    for op in model["operators"]:
        assert set(op["requires"] + op["adds"]) <= facts
    goals = {"full": ["ACF"], "next_proof": ["AC6"], "collective": ["AC8"], "builder_loop": ["ACB"]}
    # Explicit conditional closure; absent providers are not actual facts.
    unknown = sorted(set(f for op in model["operators"] for f in op["requires"]) - set(model["initial_facts"]) - set(f for op in model["operators"] for f in op["adds"]))
    conditional = {**model, "initial_facts": model["initial_facts"] + unknown}
    searches = {k: backward_plans(conditional if k == "full" else model, v) for k, v in goals.items()}
    searches["full"]["conditional_assumptions"] = unknown
    for p in searches["full"]["plans"]:
        p["unresolved_facts"] = unknown
        p["status"] = "UNRESOLVED"
    reach = forward(model)
    required = set(searches["full"]["plans"][0]["operators"])
    useful = [o["id"] for o in model["operators"] if o["id"] in required and set(o["adds"]) <= set(reach["facts"])]
    # Independent exhaustive oracle for the proposed first proof.
    target = {"AC6"}
    feasible = []
    for n in range(len(ids) + 1):
        for subset in itertools.combinations(ids, n):
            # Native forward treats an empty selection as all operators.
            reached = set(model["initial_facts"]) if not subset else set(forward(model, list(subset))["facts"])
            if target <= reached:
                feasible.append(set(subset))
    oracle = sorted(sorted(p) for p in feasible if not any(q < p for q in feasible))
    computed = sorted(p["operators"] for p in searches["next_proof"]["plans"])
    assert oracle == computed
    # Challenge: removing replay must block shared-world admission under this model.
    blocked = forward(model, blocked_facts=["AC5"])
    assert "AC8" not in blocked["facts"]
    assert "ACB" not in blocked["facts"]
    assert "ACF" not in reach["facts"]
    return {
        "id": "AC-PI1", "input_digest": digest(model),
        "status": "UNRESOLVED_FULL_TARGET; PROVISIONAL_NEXT_PROOF",
        "searches": searches, "forward": reach, "useful_operators": useful,
        "dependency_impact": {f: dependency_impact(model, f) for f in ("AC2", "AC5", "AC6")},
        "challenge": {
            "independent_exhaustive_oracle": oracle,
            "replay_removed_blocks_shared_world": True,
            "replay_removed_blocks_builder_loop": True,
            "replay_gate_is_declared_design_premise_not_universal_necessity": True,
            "parallel_region_specification_allowed": True,
            "first_proof_is_checkpoint_not_full_product": True
        },
        "measurements": {"development_hours": None, "operating_cost": None, "player_engagement": None},
        "game_runs": 0, "verified_game_capabilities": []
    }

def main():
    model = json.loads((ROOT / "seed.json").read_text())
    result = calculate(model)
    assert result == calculate(model)
    selected = {
        "id": "AC-SS1", "kind": "SystemSeedIR", "parent_digest": digest(model),
        "target": "ACF", "horizon": model["semantics"],
        "constraints": model["constraints"], "gaps": model["gaps"],
        "selected_scope": result["searches"]["next_proof"]["plans"],
        "status": "PROVISIONAL_CONDITIONAL_ON_DECLARED_MODEL",
        "materialization": {"eligible": "projection documentation/calculator only", "game_implementation": "NOT_SELECTED", "provider_bindings": []},
        "evidence_guards": model["operators"]
    }
    for name, value in (("result.json", result), ("selected_seed.json", selected)):
        (ROOT / name).write_text(json.dumps(value, indent=2) + "\n")
    print(json.dumps({"status": result["status"], "searches": result["searches"], "oracle_match": True, "identical_rerun": True}, indent=2))
if __name__ == "__main__":
    main()

