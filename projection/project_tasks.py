"""Additive task projection using the preserved Trajecta structural engine.

Dependencies and acceptance come from canonical backlog, not generated prose.
Selection is a bounded local slice; dependency order is computed, effort is not.
"""
import json
import re
from pathlib import Path
from structural import backward_plans, forward, digest

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
SELECTED = {f'DEV-{n:02}' for n in [1,2,3,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,31,32,37,38,41,42,46,47,48,65,66,67,68,71,72,81,87]}

def calculate():
    tasks = []
    for path in ['README.md', 'docs/TAREFAS_ITAIPU.md']:
        for line in (REPO/path).read_text().splitlines():
            if not re.match(r'\| DEV-\d+ \|', line):
                continue
            cells = [c.strip() for c in line.strip('|').split('|')]
            if len(cells) != 4:
                raise ValueError(f'bad task row: {line}')
            tid, delivery, acceptance, dependencies = cells
            tasks.append(dict(id=tid, delivery=delivery, acceptance=acceptance,
                requires=re.findall(r'DEV-\d+', dependencies), source=path,
                selected=tid in SELECTED, extension='[S]' in delivery))
    by_id = {t['id']: t for t in tasks}
    assert len(by_id) == len(tasks) == 100
    assert all(set(t['requires']) <= by_id.keys() for t in tasks)
    # No unapproved rule extension or external production provider is silently selected.
    assert not any(t['extension'] for t in tasks if t['selected'])
    model = dict(id='AC-TASKS-1', initial_facts=[], target_facts=sorted(SELECTED),
        operators=[dict(id=t['id'], requires=t['requires'], adds=[t['id']]) for t in tasks])
    search = backward_plans(model)
    assert len(search['plans']) == 1 and not search['plans'][0]['unresolved_facts']
    assert set(search['plans'][0]['operators']) == SELECTED
    ordered = forward(model, SELECTED)
    assert not ordered['blocked_operators']
    # Independent Kahn closure, separate from native forward/backward.
    completed, waves = set(), []
    while completed != SELECTED:
        ready = sorted(t for t in SELECTED-completed if set(by_id[t]['requires']) <= completed)
        assert ready, 'dependency cycle'
        waves.append(ready)
        completed.update(ready)
    assert waves == ordered['waves']
    complete_search=backward_plans(model,sorted(by_id))
    assert len(complete_search['plans'])==1
    assert len(complete_search['plans'][0]['operators'])==100
    seed = dict(id='AC-TASK-SEED-1', kind='SystemSeedIR', status='CONDITIONAL_PROJECTION',
        parent_seeds=['AC-RS2', 'AC-IS1'], tasks=tasks,
        constraints=['No change to OSM cartography or canonical gameplay rules',
            'UI observes RM1; preview and saved session use the same transition',
            'No issue is complete without task-specific evidence and verified prerequisites',
            'External playtests, production providers, independent reviews cannot be fabricated'],
        selected=sorted(SELECTED), waves=waves,
        unselected_policy='Explicit follow-up prerequisites; not declared impossible or completed',
        materialization='Refinements of RMD/RME/RMF/RM4/RMA; no new canonical gameplay fields')
    return seed, dict(seed_hash=digest(seed), search=search, full_dependency_search=complete_search,independently_verified=True,
        structural_waves=len(waves), tasks_total=100, tasks_selected=len(SELECTED),
        note='Dependency calculation proves order only; acceptance remains to execute')

if __name__ == '__main__':
    result = calculate()
    assert result == calculate()
    for name, value in zip(['task_seed.json', 'task_projection.json'], result):
        (ROOT/name).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({'selected':len(SELECTED), 'waves':result[0]['waves']}))
