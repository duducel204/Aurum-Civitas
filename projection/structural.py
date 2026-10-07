"""Deterministic structural calculations for compact Projection/System Seed models.

This module does not perform semantic formalization and does not choose technologies.
It operates only on explicitly declared facts and operators.
"""
from __future__ import annotations
from dataclasses import dataclass
import hashlib
import json


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def validate_references(model):
    facts = set(model.get("facts", [])) | set(model.get("initial_facts", [])) | set(model.get("target_facts", []))
    op_ids = set()
    for op in model.get("operators", []):
        if op["id"] in op_ids:
            raise ValueError(f"duplicate operator id: {op['id']}")
        op_ids.add(op["id"])
        facts.update(op.get("requires", []))
        facts.update(op.get("adds", []))
    return {"operators": len(op_ids), "facts": len(facts), "reference_integrity": True}


def forward(model, selected_operator_ids=None, blocked_facts=()):
    selected = set(selected_operator_ids or [o["id"] for o in model.get("operators", [])])
    blocked = set(blocked_facts)
    facts = set(model.get("initial_facts", []))
    pending = {o["id"]: o for o in model.get("operators", []) if o["id"] in selected}
    waves = []
    while pending:
        ready = sorted(
            oid for oid, op in pending.items()
            if set(op.get("requires", [])) <= facts and not (set(op.get("adds", [])) & blocked)
        )
        if not ready:
            break
        waves.append(ready)
        for oid in ready:
            facts.update(pending.pop(oid).get("adds", []))
    return {"facts": sorted(facts), "waves": waves, "blocked_operators": sorted(pending)}


def backward_plans(model, target_facts=None, budget=20000):
    target = set(target_facts or model.get("target_facts", []))
    initial = set(model.get("initial_facts", []))
    operators = {o["id"]: o for o in model.get("operators", [])}
    providers = {}
    for op in operators.values():
        for fact in op.get("adds", []):
            providers.setdefault(fact, []).append(op)

    seen = set()
    plans = set()

    def visit(required, used, unresolved):
        produced = {f for oid in used for f in operators[oid].get("adds", [])}
        known = initial | produced
        missing = frozenset(set(required) - known - set(unresolved))
        key = (missing, frozenset(used), frozenset(unresolved))
        if key in seen:
            return
        seen.add(key)
        if len(seen) > budget:
            raise RuntimeError("UNRESOLVED: backward expansion budget exhausted")
        if not missing:
            reached = set(forward(model, used)["facts"])
            if target <= (reached | set(unresolved)):
                plans.add((frozenset(used), frozenset(unresolved)))
            return
        fact = min(missing)
        alternatives = providers.get(fact, [])
        if not alternatives:
            visit(missing, used, set(unresolved) | {fact})
            return
        for op in alternatives:
            visit(missing | frozenset(op.get("requires", [])), set(used) | {op["id"]}, unresolved)

    visit(frozenset(target), set(), set())
    minimal = [(p,u) for p,u in plans if not any(q < p and v == u for q,v in plans)]
    out = []
    for p,u in sorted(minimal, key=lambda x:(len(x[0]), tuple(sorted(x[0])))):
        fwd = forward(model, p)
        out.append({
            "operators": sorted(p),
            "facts": fwd["facts"],
            "waves": fwd["waves"],
            "unresolved_facts": sorted(u),
            "structural_steps": len(p),
            "status": "CONDITIONAL_PROJECTION" if not u else "UNRESOLVED"
        })
    return {"plans": out, "expanded": len(seen), "budget": budget}


def dependency_impact(model, fact):
    affected = set()
    frontier = [fact]
    while frontier:
        current = frontier.pop()
        for op in model.get("operators", []):
            if current in op.get("requires", []) and op["id"] not in affected:
                affected.add(op["id"])
                frontier.extend(op.get("adds", []))
    return sorted(affected)


def pareto_frontier(items, minimize=(), maximize=()):
    def dominates(a,b):
        weak = all(a[k] <= b[k] for k in minimize) and all(a[k] >= b[k] for k in maximize)
        strict = any(a[k] < b[k] for k in minimize) or any(a[k] > b[k] for k in maximize)
        return weak and strict
    out=[]
    for i,a in enumerate(items):
        if not any(i != j and dominates(b,a) for j,b in enumerate(items)):
            out.append(a)
    return out
