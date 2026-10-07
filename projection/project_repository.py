"""Refine AC capabilities into repository contracts before assigning paths."""
import json
from pathlib import Path
from structural import backward_plans, forward, digest

ROOT = Path(__file__).resolve().parent

# Human formalization inputs: these contracts are design premises, not measurements.
SPECS = [
 ('RM0','AC1',[], 'rules', 'Frozen RuleSet: version, map seed, fixed tick, recipes, capacities, bootstrap, legal actions and mission; reject missing mandatory numeric values.', 'RuleSet -> validated contract or unresolved fields', 'Changing rules invalidates incompatible traces; no implicit defaults.', 'Reject incomplete recipes and unversioned rule changes.'),
 ('RM1','AC2',['RM0'], 'simulation', 'Only owner of canonical GameState; step takes ordered commands and advances one fixed tick, returning state and events without DOM, network or wall clock.', 'step(state, commands, rules) -> state, events, rejections', 'Rejected command cannot mutate state; tie breaks use frozen IDs/order.', 'Same state and commands give identical state; render frequency cannot alter outcome.'),
 ('RM2','AC3',['RM1'], 'economy', 'Finite stock, cargo, storage, work in process, outputs and incorporated construction materials; explicit recipe accounting and bounded inventories.', 'applyEconomicEffects(state, effects, rules) -> state or rejection', 'Reserve then deliver then consume once; overflow waits; depletion stops harvest.', 'Competing workers cannot take the last unit twice; construction fails without delivered inputs.'),
 ('RM3','AC4',['RM1'], 'transport', 'Road graph, bounded queues, carrier cargo, route ID and persisted waypoint; explicit last-mile policy and base-to-sawmill deliveries.', 'advanceTransport(state, rules) -> transfer effects and progress', 'Disconnected/changed route emits blocked state or explicit reroute; never teleports cargo.', 'Connected path advances without oscillation; blocked routes conserve cargo; base supplies sawmill.'),
 ('RM4','AC5',['RM1','RM2','RM3'], 'replay', 'Full command stream, accepted/rejected results, initial state, versions, checkpoints and canonical hashes; UI messages are only a projection.', 'record(run); replay(initial, commands, rules) -> canonical state hash', 'Version/hash mismatch stops verification; correction is an appended event.', 'Truncation, tampering and incompatible rules rejected; replay final state equals execution.'),
 ('RM5','AC6',['RM4'], 'judge', 'Independently derive mission outcome and metric vector from replayed state; compare matched inputs without self-reported success.', 'judge(trace, mission) -> evidence verdict and metrics', 'Missing evidence is UNVERIFIED; invalid replay cannot award completion.', 'False completion claim rejected; road/direct trials share exact starting world and rule version.'),
 ('RM6','AC9',['RM0'], 'regions', 'Minimal pixel world topology and seven explicit production profiles; forests favor wood, fertile land food; exports/imports reference canonical resources.', 'RegionProfile and adjacency -> regional production modifiers', 'Profile numbers unresolved until frozen; fictional telemetry labeled fictional.', 'Regional advantages match profiles; topology/resource IDs valid; render observes same map.'),
 ('RM7','ACA',['RM2','RM6'], 'sustainability', 'Food stocks, population demand and forest regeneration are tick-accounted flows; preservation limits explicit.', 'advanceEcology(state, rules, profiles) -> economic effects', 'Starvation/depletion/renewal have explicit states; regeneration is recorded source, not hidden minting.', 'Food balance and harvesting limits; zero food and exhausted forest have declared consequences.'),
 ('RM8','AC7',['RM4'], 'membership', 'Stable authenticated principal, city/community membership, region ownership, rights and checkpoint recovery; identity provider remains unbound.', 'authorize(principal, command, membership) -> allow/deny', 'Unauthorized mutation denied; historical actor IDs survive membership changes.', 'Cross-territory writes denied; restart restores same checkpoint; shared-city permissions checked.'),
 ('RM9','AC8',['RM4','RM8','RM3','RM6'], 'world', 'One authoritative command ordering across cities; finite stock reservation, physical trade transit and exactly-once delivery effects.', 'submit(commandId, expectedVersion, actor, payload) -> ordered result', 'Duplicate retries return prior result; stale commands revalidate/reject; disconnect does not duplicate cargo.', 'Concurrent stock claims cannot overspend; retries cannot mint; cities agree on ordered checkpoint.'),
 ('RMA','ACB',['RM5'], 'contributions', 'Mission binds semantic IDs, exact source/config diff and independent evidence; upgrade only after review and compatible migration.', 'qualify(submission, judgeEvidence) -> accepted/rejected contribution event', 'Self-awards rejected; incompatible upgrades return to Seed diff and reprojection.', 'Changing strategy changes controlled outcome; invalid proof cannot qualify upgrade.'),
 ('RMB','ACC',['RM8','RMA'], 'recognition', 'Append-only founder/route monuments, civic titles and era seals point to accepted contribution IDs; title criteria frozen.', 'attribute(contributionEvent, eraContract) -> recognition event', 'Event uniqueness prevents duplicate awards; corrections preserve historical record.', 'Forged awards rejected; repeated attribution idempotent; old era seals cannot be newly fabricated.'),
 ('RMC','ACD',['RM9','RM6'], 'provenance', 'Regional records carry origin, game/real classification, correction chain and evidence; external utility remains ACE unresolved.', 'validateRecord(record) -> accepted record or rejection', 'Game events cannot become real-world observations by relabeling.', 'Missing provenance rejected; corrections preserve prior record and link replacement.'),
 ('RMD',None,['RM1'], 'observer', 'Read-only snapshot consumed by existing Canvas/React shell; local input sends commands; animation may not mutate rules or state.', 'observe(state) -> readonly view; input -> command', 'Stale snapshot is display-only; rendering cannot mint resources or award success.', 'Observer does not mutate canonical state; UI command replay equals headless command replay.'),
]

def calculate():
    parent=json.loads((ROOT/'seed.json').read_text())
    modules=[]
    for mid,cap,deps,label,contract,interface,failure,test in SPECS:
        modules.append(dict(id=mid,capability=cap,requires=deps,label=label,contract=contract,interface=interface,failure=failure,test={'id':'RT'+mid[2:],'obligation':test,'status':'NOT_EXECUTED'},mission={'id':'RJ'+mid[2:],'acceptance':test,'status':'PLANNED'},evidence_status='UNVERIFIED'))
    ids={m['id'] for m in modules}
    assert len(ids)==len(modules)
    assert all(set(m['requires']) <= ids for m in modules)
    assert {m['capability'] for m in modules if m['capability']} == set(parent['facts'])-{'AC0','ACE','ACF','GF'}
    graph={'facts':sorted(ids),'initial_facts':[], 'operators':[{'id':'RX'+m['id'][2:],'requires':m['requires'],'adds':[m['id']]} for m in modules]}
    # Complete module dependency closure and headless checkpoint, calculated natively.
    searches={k:backward_plans(graph,v) for k,v in {'repository':sorted(ids),'next_proof':['RM5','RMD'],'collective':['RM9','RM7','RMB','RMD']}.items()}
    assert all(len(s['plans'])==1 and not s['plans'][0]['unresolved_facts'] for s in searches.values())
    assert set(forward(graph)['facts'])==ids
    # Independent prerequisite walk verifies each native backward result.
    by_id={m['id']:m for m in modules}
    for key,targets in {'repository':sorted(ids),'next_proof':['RM5','RMD'],'collective':['RM9','RM7','RMB','RMD']}.items():
        needed=set(); pending=list(targets)
        while pending:
            mid=pending.pop()
            if mid not in needed:
                needed.add(mid); pending.extend(by_id[mid]['requires'])
        assert {'RX'+mid[2:] for mid in needed} == set(searches[key]['plans'][0]['operators'])
    assert 'RM9' not in forward(graph,blocked_facts=['RM8'])['facts']
    assert 'RMB' not in forward(graph,blocked_facts=['RMA'])['facts']
    # Alternative packaging challenge: all-in-one with compliant internal boundaries is
    # semantically admissible too. File count is not evidence of engineering quality.
    candidates=[{'id':'RP0','kind':'retain_current_UI_orchestration','admissible':False,'reason':'canonical transition remains tied to frame/wall clock'}, {'id':'RP1','kind':'single_headless_module_with_explicit_contract_sections','admissible':True}, {'id':'RP2','kind':'one_headless_file_per_contract_existing_UI_shell','admissible':True}]
    selection={'id':'RP2','status':'PROVISIONAL','basis':'Explicit maintainability preference for modular code; deterministic one-contract/one-path expansion. No measured effort/cost dominance over RP1.','challengers':candidates,'unbound':['identity provider','database','hosting','multiplayer transport','test runner'],'implementation_permission':'planned bindings only; gameplay not implemented by this projection'}
    seed={'id':'AC-RS2','kind':'SystemSeedIR','parent_digest':digest(parent),'status':'PROVISIONAL','modules':modules,'searches':searches,'selection':selection,'open_gaps':parent['gaps'],'states':{'construction':['planned','awaiting_materials','building','operational'],'transport':['idle','reserved','moving','blocked','delivered'],'submission':['proposed','replayed','judged','accepted','rejected'],'recognition':['pending','attributed','corrected']},'trace_contract':['semantic_id','source_ref','rules_version','mission_id','actor_id','tick','command_id','previous_hash','next_hash','evidence_id'],'global_invariants':parent['constraints']}
    # Paths introduced only AFTER semantic calculation and selection.
    bindings=[{'module_id':m['id'],'implementation':'lib/aurum/'+m['label']+'.ts','test_id':m['test']['id'],'test_path':'tests/aurum/'+m['label']+'.test.ts','mission_id':m['mission']['id'],'mission_path':'missions/'+m['mission']['id']+'.json','evidence_path':'evidence/'+m['test']['id']+'/','runtime_owner':m['id'],'status':'PROJECTED_NOT_CREATED'} for m in modules]
    manifest={'id':'AC-M2','seed_digest':digest(seed),'bindings':bindings,'migration':[{'source':'lib/game-engine.ts','to':['RM0','RM1','RM2','RM3'],'policy':'Extract existing types/helpers then close semantic gaps; compatibility facade until callers migrated.'},{'source':'components/game/game-world.tsx','to':['RM1','RMD'],'policy':'Move state transitions/build commands out; keep Canvas and React shell observing canonical state.'}],'provider_bindings':[]}
    assert len({b['implementation'] for b in bindings})==len(modules)
    # Canonical reference round trip through manifest; not an implementation round trip.
    assert {b['module_id'] for b in bindings}==ids
    result={'seed_digest':digest(seed),'manifest_digest':digest(manifest),'module_count':len(modules),'test_obligations':len(modules),'mission_count':len(modules),'searches':searches,'checks':{'all_module_refs_valid':True,'all_derived_capabilities_covered':True,'manifest_id_roundtrip':True,'independent_prerequisite_walk_matches':True,'missing_membership_blocks_shared_world':True,'missing_qualification_blocks_recognition':True,'current_UI_candidate_rejected':True,'compliant_single_module_retained_as_challenger':True},'gameplay_runs':0,'full_target_status':'UNRESOLVED: ACE/GF and empirical guards'}
    return seed,manifest,result

def main():
    first=calculate(); assert first==calculate()
    for name,value in zip(['repository_seed.json','repository_manifest.json','repository_result.json'],first):
        (ROOT/name).write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')
    seed,manifest,result=first
    lines=['# Aurum — projeção do repositório','', 'Status: PROVISIONAL. Expansão planejada; gameplay não implementado.', '', 'Formalização humana de contratos → cálculo backward/forward do Trajecta → Seed → manifesto de caminhos. Custos, engajamento e superioridade de arquitetura não foram medidos.','', '## Estrutura derivada','', '| ID | Responsabilidade | Implementação projetada | Teste / missão |','| --- | --- | --- | --- |']
    for m,b in zip(seed['modules'],manifest['bindings']):
        lines.append(f"| {m['id']} | {m['label']} | `{b['implementation']}` | {b['test_id']} / {b['mission_id']} |")
    lines+=['','## Ordem calculada','']
    for key,s in seed['searches'].items():
        p=s['plans'][0]; lines.append(f"- {key}: {p['structural_steps']} transições; ondas: "+' → '.join(','.join(w) for w in p['waves']))
    lines+=['','## Contratos e provas','']
    for m in seed['modules']:
        lines += [f"### {m['id']} — {m['label']}",m['contract'],'',f"Interface: `{m['interface']}`",f"Falha: {m['failure']}",f"Prova {m['test']['id']} / missão {m['mission']['id']}: {m['test']['obligation']}",'']
    lines+=['## Migração e limites','', 'Preservar o shell React/Canvas. Extrair a transição do loop de animação; migrar helpers de lib/game-engine.ts por contrato. Cada comando entra na mesma simulação usada pelo replay e pelo juiz.','','RP0 rejeitado por acoplamento ao relógio/interface. RP1 (um arquivo headless com contratos internos) permanece admissível. RP2 (arquivos por contrato) foi escolhido provisoriamente pela preferência explícita de modularidade e manutenção, não por custo matemático inventado.','','Testes/missões/caminhos são obrigações planejadas, não arquivos executáveis já implementados. Números de receitas, tick, bootstrap, títulos e perfis precisam ser congelados antes da implementação correspondente. Provedores de identidade, persistência, rede e hosting não foram escolhidos.','','A busca resolve o grafo declarado. O round trip verifica IDs do manifesto, não Seed → jogo executado → Seed. ACE/GF e todas as provas empíricas continuam abertas.','','Reproduzir: `python projection/project_repository.py`.']
    (ROOT/'REPOSITORY_PROJECTION.md').write_text('\n'.join(lines)+'\n')
    print(json.dumps({'modules':result['module_count'],'missions':result['mission_count'],'deterministic_rerun':True,'checks':result['checks'],'next_proof':result['searches']['next_proof']['plans'][0]['waves']}))

if __name__=='__main__': main()
