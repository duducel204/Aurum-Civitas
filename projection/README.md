# Aurum Civitas — projection from actual source
Status: PROVISIONAL next proof; UNRESOLVED full outcome.

## Source and scope
Aurum source frozen at 7ce60f8a18ae458a5c9ba44567cab3d852cdb766.
Trajecta frozen at 94aa09e3770e9fe77aa2fd4dcbf04f88d45116f3; engine/structural.py reused verbatim.
The supplied collective-world GDD is the design input. AC* IDs extend P0 without changing its meanings. Current source observations are not certified gameplay capabilities.

## Result
The declared dependency graph yields these inclusion-minimal closures:
- Next economic/replay proof AC6: 6 operators, 5 dependency waves.
- Shared regional economy AC8: 8 operators, 6 waves.
- Reviewed builder missions ACB: 7 operators, 6 waves.
- Full coupled goal ACF: 14 operators, 8 conditional waves, unresolved ACE and GF.

These are bookkeeping counts, not development hours or proof of globally optimal architecture. This model declares one provider per capability; it cannot compare alternative architectures or demonstrate global optimality.

## Calculated full horizon
| Wave | Operators | Outcome |
| --- | --- | --- |
| 1 | AO1 | Freeze map, rules, actions and timing |
| 2 | AO2, AO9 | Separate simulation transition; specify regional advantages |
| 3 | AO3, AO4 | Conserve resources/material construction; close road transport |
| 4 | AO5, AOA | Complete replay; food and regeneration balance |
| 5 | AO6, AO7 | Independent matched-run proof; communities and persistent territories |
| 6 | AO8, AOB | Cross-city trade; independently judged contributor missions |
| 7 | AOC, AOD | Permanent evidence-based memory; provenance/correction of region data |
| 8 | AOE | Full goal, conditional on external utility and novelty evidence |

The economic/replay checkpoint does not replace the full target. Region specification can proceed alongside simulation separation. World sharing depends on replay here because auditability is an explicit design premise; a different protocol could satisfy auditability and requires a new operator/model.

## Concrete source gaps
- Buildings spend money; delivered planks do not fund construction.
- Base wood has no inspected transport path back into a sawmill.
- Rule orchestration is inside the React animation loop. Capped frame dt and wall-clock metrics make controlled run comparison incomplete.
- Logs are truncated to 12 messages, without full actions/checkpoints.
- Road waypoints are recomputed from the moving position. Oscillation is a hypothesis to test, not an observed failure.
- No source-level shared-city membership, regional trade or contribution monument contracts were found in the inspected tree.

## Next discriminating experiment
Freeze the existing 10-plank mission and exact inputs. Advance a single authoritative state using fixed ticks; compare direct versus connected-road layouts from the same initial world. Observe completion ticks, actual route traveled, every delivered unit and remaining stocks. Replay both action streams and require identical canonical final states.

Conservation must include remaining trees + cargo + stored wood + wood being processed + produced planks, with an explicit recipe conversion. Separately check the finite bootstrap currency against construction spending.

Record contributors only against independently accepted events. Founder monuments, route milestones, civic titles and era seals remain permanent history; their admission criteria must be frozen.

## Challenges and open hypotheses
The independent exhaustive oracle enumerates all 16,384 operator subsets and matches the next-proof backward closure. Repeated calculation is identical. Removing replay blocks shared-world and builder-loop admission under the declared model.
No game runs were performed; all gameplay evidence guards remain UNVERIFIED.
The GDD's 40% delivery improvement is illustrative. Identity + utility + recognition causing retention is a player-study hypothesis.
Seven region archetypes are preserved in seed.json. Exact yields, recipes, food/forest recovery, trade rules, title thresholds and eras remain open.
ACE: fictional game telemetry cannot stand in for verified real-world microregion data; name a data use case and test external demand.
GF: useful structural novelty still lacks a validated judge in the prior Trajecta model.

## Reproduce
Run: python projection/calculate.py
Requires Python 3.10+ standard library only. No LLM, APIs or network calls.
The selected seed permits only these projection artifacts; gameplay implementation and hosting bindings remain unselected.
