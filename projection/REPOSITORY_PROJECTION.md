# Aurum — projeção do repositório

Status: PROVISIONAL. Expansão planejada; gameplay não implementado.

Formalização humana de contratos → cálculo backward/forward do Trajecta → Seed → manifesto de caminhos. Custos, engajamento e superioridade de arquitetura não foram medidos.

## Estrutura derivada

| ID | Responsabilidade | Implementação projetada | Teste / missão |
| --- | --- | --- | --- |
| RM0 | rules | `lib/aurum/rules.ts` | RT0 / RJ0 |
| RM1 | simulation | `lib/aurum/simulation.ts` | RT1 / RJ1 |
| RM2 | economy | `lib/aurum/economy.ts` | RT2 / RJ2 |
| RM3 | transport | `lib/aurum/transport.ts` | RT3 / RJ3 |
| RM4 | replay | `lib/aurum/replay.ts` | RT4 / RJ4 |
| RM5 | judge | `lib/aurum/judge.ts` | RT5 / RJ5 |
| RM6 | regions | `lib/aurum/regions.ts` | RT6 / RJ6 |
| RM7 | sustainability | `lib/aurum/sustainability.ts` | RT7 / RJ7 |
| RM8 | membership | `lib/aurum/membership.ts` | RT8 / RJ8 |
| RM9 | world | `lib/aurum/world.ts` | RT9 / RJ9 |
| RMA | contributions | `lib/aurum/contributions.ts` | RTA / RJA |
| RMB | recognition | `lib/aurum/recognition.ts` | RTB / RJB |
| RMC | provenance | `lib/aurum/provenance.ts` | RTC / RJC |
| RMD | observer | `lib/aurum/observer.ts` | RTD / RJD |

## Ordem calculada

- repository: 14 transições; ondas: RX0 → RX1,RX6 → RX2,RX3,RXD → RX4,RX7 → RX5,RX8 → RX9,RXA → RXB,RXC
- next_proof: 7 transições; ondas: RX0 → RX1 → RX2,RX3,RXD → RX4 → RX5
- collective: 13 transições; ondas: RX0 → RX1,RX6 → RX2,RX3,RXD → RX4,RX7 → RX5,RX8 → RX9,RXA → RXB

## Contratos e provas

### RM0 — rules
Frozen RuleSet: version, map seed, fixed tick, recipes, capacities, bootstrap, legal actions and mission; reject missing mandatory numeric values.

Interface: `RuleSet -> validated contract or unresolved fields`
Falha: Changing rules invalidates incompatible traces; no implicit defaults.
Prova RT0 / missão RJ0: Reject incomplete recipes and unversioned rule changes.

### RM1 — simulation
Only owner of canonical GameState; step takes ordered commands and advances one fixed tick, returning state and events without DOM, network or wall clock.

Interface: `step(state, commands, rules) -> state, events, rejections`
Falha: Rejected command cannot mutate state; tie breaks use frozen IDs/order.
Prova RT1 / missão RJ1: Same state and commands give identical state; render frequency cannot alter outcome.

### RM2 — economy
Finite stock, cargo, storage, work in process, outputs and incorporated construction materials; explicit recipe accounting and bounded inventories.

Interface: `applyEconomicEffects(state, effects, rules) -> state or rejection`
Falha: Reserve then deliver then consume once; overflow waits; depletion stops harvest.
Prova RT2 / missão RJ2: Competing workers cannot take the last unit twice; construction fails without delivered inputs.

### RM3 — transport
Road graph, bounded queues, carrier cargo, route ID and persisted waypoint; explicit last-mile policy and base-to-sawmill deliveries.

Interface: `advanceTransport(state, rules) -> transfer effects and progress`
Falha: Disconnected/changed route emits blocked state or explicit reroute; never teleports cargo.
Prova RT3 / missão RJ3: Connected path advances without oscillation; blocked routes conserve cargo; base supplies sawmill.

### RM4 — replay
Full command stream, accepted/rejected results, initial state, versions, checkpoints and canonical hashes; UI messages are only a projection.

Interface: `record(run); replay(initial, commands, rules) -> canonical state hash`
Falha: Version/hash mismatch stops verification; correction is an appended event.
Prova RT4 / missão RJ4: Truncation, tampering and incompatible rules rejected; replay final state equals execution.

### RM5 — judge
Independently derive mission outcome and metric vector from replayed state; compare matched inputs without self-reported success.

Interface: `judge(trace, mission) -> evidence verdict and metrics`
Falha: Missing evidence is UNVERIFIED; invalid replay cannot award completion.
Prova RT5 / missão RJ5: False completion claim rejected; road/direct trials share exact starting world and rule version.

### RM6 — regions
Minimal pixel world topology and seven explicit production profiles; forests favor wood, fertile land food; exports/imports reference canonical resources.

Interface: `RegionProfile and adjacency -> regional production modifiers`
Falha: Profile numbers unresolved until frozen; fictional telemetry labeled fictional.
Prova RT6 / missão RJ6: Regional advantages match profiles; topology/resource IDs valid; render observes same map.

### RM7 — sustainability
Food stocks, population demand and forest regeneration are tick-accounted flows; preservation limits explicit.

Interface: `advanceEcology(state, rules, profiles) -> economic effects`
Falha: Starvation/depletion/renewal have explicit states; regeneration is recorded source, not hidden minting.
Prova RT7 / missão RJ7: Food balance and harvesting limits; zero food and exhausted forest have declared consequences.

### RM8 — membership
Stable authenticated principal, city/community membership, region ownership, rights and checkpoint recovery; identity provider remains unbound.

Interface: `authorize(principal, command, membership) -> allow/deny`
Falha: Unauthorized mutation denied; historical actor IDs survive membership changes.
Prova RT8 / missão RJ8: Cross-territory writes denied; restart restores same checkpoint; shared-city permissions checked.

### RM9 — world
One authoritative command ordering across cities; finite stock reservation, physical trade transit and exactly-once delivery effects.

Interface: `submit(commandId, expectedVersion, actor, payload) -> ordered result`
Falha: Duplicate retries return prior result; stale commands revalidate/reject; disconnect does not duplicate cargo.
Prova RT9 / missão RJ9: Concurrent stock claims cannot overspend; retries cannot mint; cities agree on ordered checkpoint.

### RMA — contributions
Mission binds semantic IDs, exact source/config diff and independent evidence; upgrade only after review and compatible migration.

Interface: `qualify(submission, judgeEvidence) -> accepted/rejected contribution event`
Falha: Self-awards rejected; incompatible upgrades return to Seed diff and reprojection.
Prova RTA / missão RJA: Changing strategy changes controlled outcome; invalid proof cannot qualify upgrade.

### RMB — recognition
Append-only founder/route monuments, civic titles and era seals point to accepted contribution IDs; title criteria frozen.

Interface: `attribute(contributionEvent, eraContract) -> recognition event`
Falha: Event uniqueness prevents duplicate awards; corrections preserve historical record.
Prova RTB / missão RJB: Forged awards rejected; repeated attribution idempotent; old era seals cannot be newly fabricated.

### RMC — provenance
Regional records carry origin, game/real classification, correction chain and evidence; external utility remains ACE unresolved.

Interface: `validateRecord(record) -> accepted record or rejection`
Falha: Game events cannot become real-world observations by relabeling.
Prova RTC / missão RJC: Missing provenance rejected; corrections preserve prior record and link replacement.

### RMD — observer
Read-only snapshot consumed by existing Canvas/React shell; local input sends commands; animation may not mutate rules or state.

Interface: `observe(state) -> readonly view; input -> command`
Falha: Stale snapshot is display-only; rendering cannot mint resources or award success.
Prova RTD / missão RJD: Observer does not mutate canonical state; UI command replay equals headless command replay.

## Migração e limites

Preservar o shell React/Canvas. Extrair a transição do loop de animação; migrar helpers de lib/game-engine.ts por contrato. Cada comando entra na mesma simulação usada pelo replay e pelo juiz.

RP0 rejeitado por acoplamento ao relógio/interface. RP1 (um arquivo headless com contratos internos) permanece admissível. RP2 (arquivos por contrato) foi escolhido provisoriamente pela preferência explícita de modularidade e manutenção, não por custo matemático inventado.

Testes/missões/caminhos são obrigações planejadas, não arquivos executáveis já implementados. Números de receitas, tick, bootstrap, títulos e perfis precisam ser congelados antes da implementação correspondente. Provedores de identidade, persistência, rede e hosting não foram escolhidos.

A busca resolve o grafo declarado. O round trip verifica IDs do manifesto, não Seed → jogo executado → Seed. ACE/GF e todas as provas empíricas continuam abertas.

Reproduzir: `python projection/project_repository.py`.
