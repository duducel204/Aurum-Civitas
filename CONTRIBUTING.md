# Contributing

Aurum Civitas should remain easy to fork, understand and modify.

## One change, one proof

Prefer small pull requests that add one observable capability.

Examples:

- "add finite stone deposits";
- "add a quarry that physically delivers stone";
- "add a mission that requires 20 planks";
- "make a road-routing failure reproducible".

For each contribution, describe:

1. what changed;
2. what should be observable in the running world;
3. how to reproduce it;
4. what metric or state proves it worked.

## Do not couple unrelated systems

Avoid combining gameplay, authentication, backend, AI agents and visual redesign in one change.

## Core invariants

- resources do not teleport;
- official outcomes must come from runtime execution;
- the same initial state should be repeatable;
- player infrastructure controls workers indirectly;
- roads should matter to movement;
- a completed mission does not imply automatic merge into the canonical game.

## Suggested Git flow

```
fork
→ branch
→ implement one capability
→ run it
→ capture evidence
→ pull request
```

The project should make it easy for another developer to understand not only the code diff, but the world consequence of that diff.
