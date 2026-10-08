"use client";
/** RMD: DEV-17/22/26/27/28/37/38/46/47 — all values derive from current state. */
import React,{useState} from 'react';
import type {Point,Rules,State,Store} from '@/lib/aurum/rules.ts';
import {guidance,logisticsReport,houseImpact,distributionReport} from '@/lib/aurum/presentation.ts';
export default function RegionalPanels({state,rules,selectedStore,selected,role,suggestions,onSelect}:
  {state:State;rules:Rules;selectedStore?:Store;selected:Point;role:string;suggestions:Point[];onSelect:(p:Point)=>void}) {
  const [filter,setFilter]=useState('all');
  const report=logisticsReport(state,rules),impact=houseImpact(selected,role,state,rules);
  const service=selectedStore?state.services?.buildings[selectedStore.id]:undefined;
  return <section className="grid gap-3 text-sm md:grid-cols-2" aria-label="Informações da região">
    <div className="rounded bg-slate-900 p-3"><h2 className="font-semibold">Estrutura selecionada</h2>
      {selectedStore?<><p>{selectedStore.id} · {selectedStore.status}</p>
        <p>{guidance[service?.reason??selectedStore.status]??'Confira estoque e acesso às ruas.'}</p>
        <p>Estoque {JSON.stringify(selectedStore.inventory)} / capacidade {selectedStore.capacity}</p>
        <p>Incorporado {JSON.stringify(selectedStore.incorporated)}</p>
        {selectedStore.construction&&<p>Trabalho {selectedStore.buildTicks}/{rules.construction[selectedStore.construction].ticks} ticks</p>}
        {service&&<p>Energia {service.supplied}/{service.demand} · moradores {service.residents}/{service.housing} · fornecedor {service.provider??'nenhum'}</p>}</>
        :<p>Selecione uma estrutura no mapa ou na lista.</p>}
      {impact&&<p>Estimativa no tick {impact.sourceTick}: demanda +{impact.addedDemand} · moradores +{impact.addedResidents} · {guidance[impact.reason??'']??impact.reason}. {impact.note}</p>}
    </div>
    <details className="rounded bg-slate-900 p-3"><summary>Estruturas e lotes — alternativa ao mapa</summary>
      <ul className="max-h-60 overflow-auto">{state.stores.map(s=><li key={s.id}>
        <button className="my-1 w-full rounded bg-slate-800 px-2 text-left" onClick={()=>onSelect(s.pos)}>{s.id} · {s.status}</button>
      </li>)}</ul>
      <p>Lotes sugeridos</p><div className="flex flex-wrap gap-2">{suggestions.map((p,i)=><button key={i} className="rounded bg-slate-800 px-3" onClick={()=>onSelect(p)}>Lote {i+1}</button>)}</div>
      <p>A seleção usa a mesma prévia e o mesmo botão Construir do mapa.</p>
    </details>
    <details className="rounded bg-slate-900 p-3"><summary>Contabilidade e gargalos</summary>
      <div className="overflow-auto"><table className="w-full text-left"><caption>Unidades materiais no tick {state.tick}</caption>
        <thead><tr><th>Material</th><th>Estoque</th><th>Trânsito</th><th>Produção</th><th>Incorporado</th><th>Total</th><th>Reservado*</th></tr></thead>
        <tbody>{Object.keys(report.total).map(r=><tr key={r}><th>{r}</th>{[report.stored,report.transit,report.work,report.incorporated,report.total,report.reserved].map((s,i)=><td key={i}>{s[r]??0}</td>)}</tr>)}</tbody></table></div>
      <p>{report.note}</p>
      {report.waiting.map(w=><p key={w.id}>{w.id} · {w.status} · falta {JSON.stringify(w.missing)}</p>)}
      {report.travelTicks.map(c=><p key={c.id}>{c.id} · {c.phase} → {c.target??'sem tarefa'} · viagem restante ≈{Math.ceil(c.remainingTicks)} ticks</p>)}
      {report.blocked.map(c=><p key={c.id}>⚠ {c.id} · {c.reason==='no-route'?'Sem rota: confira conexão de ruas.':'Entrega/pickup bloqueado: confira espaço, estoque e rota.'}</p>)}
    </details>
    <details className="rounded bg-slate-900 p-3"><summary>Cobertura elétrica</summary>
      <p>Geração {state.services?.generation} · demanda {state.services?.demand} · não atendida {state.services?.unserved} · ociosa {state.services?.curtailed} u/tick.</p>
      {distributionReport(state,rules).map(s=>{
        return <p key={s.id}>{s.id} · alcance {s.range} células pela rua · capacidade {s.capacity} u/tick · alocação {s.allocated} · {guidance[s.reason]}</p>;
      })}
      <p>Geração regional não garante atendimento: há alcance, circuitos e capacidade de distribuição.</p>
    </details>
    <details className="rounded bg-slate-900 p-3"><summary>Enciclopédia e cadeia produtiva</summary>
      <p>Valores experimentais do cenário {rules.version}; energia em unidades de jogo por tick, não medições de Itaipu.</p>
      <p>Tick {rules.tickMs} ms · colheita {rules.harvestTicks} ticks · transporte {rules.roadSpeed} m/s na rua e {rules.offroadSpeed} m/s no último trecho.</p>
      {Object.entries(rules.construction).map(([r,b])=><p key={r}>{rules.services?.roles[r]?.label??r}: {JSON.stringify(b.materials)} entregues + {b.ticks} ticks de obra.</p>)}
      {Object.entries(rules.recipes).map(([r,b])=><p key={r}>{r}: {JSON.stringify(b.inputs)} → {JSON.stringify(b.outputs)} em {b.ticks} ticks.</p>)}
      {state.stores.filter(s=>s.kind==='source'||s.kind==='producer').map(s=><p key={s.id}>{s.id} · {s.kind} · estoque {JSON.stringify(s.inventory)} · {s.work?'processando lote':'sem lote em processamento'}</p>)}
      <p>Fonte finita → coleta → transporte → serraria → tábuas → depósito → obra. Sem insumos, a produção espera; sem espaço, a entrega espera.</p>
    </details>
    <details className="rounded bg-slate-900 p-3"><summary>Linha do tempo</summary>
      <select aria-label="Filtrar eventos" className="rounded bg-slate-800 p-2" value={filter} onChange={e=>setFilter(e.target.value)}>
        <option value="all">Todos</option><option value="construction">Obras</option><option value="delivered">Entregas</option><option value="command-rejected">Rejeições</option><option value="service-changed">Serviço</option>
      </select>
      <ul className="max-h-60 overflow-auto">{state.events.filter(e=>filter==='all'||e.kind.includes(filter)).slice(-100).map((e,i)=>{
        const target=state.stores.find(s=>s.id===(e.store??e.target));
        return <li key={i}>[{e.tick}] {e.kind} · {String(e.store??e.target??e.commandId??'')} · {guidance[String(e.reason??'')]??String(e.reason??'')}
          {target&&<button className="ml-2 underline" onClick={()=>onSelect(target.pos)}>Localizar</button>}</li>;
      })}</ul>
    </details>
  </section>;
}
