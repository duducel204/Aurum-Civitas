/** RMD — DEV-02/17/18/26/27/37/38/46/47. Read-only projections. */
import type { Rules, State, Stock, Point } from './rules.ts';
import { count, total } from './economy.ts';
import { placementReason } from './geography.ts';
import { advanceServices } from './infrastructure.ts';
export const guidance: Record<string, string> = {
  'outside-map': 'Fora do mapa. Volte ao núcleo ou escolha um lote na região.',
  'mapped-terrain-blocked': 'Área mapeada preservada. Use um lote livre junto às ruas.',
  'occupied-cell': 'Lote ocupado. Selecione outro lote livre.',
  'no-road-access': 'Sem acesso à rua. Escolha um lote vizinho a uma via existente.',
  'no-delivery-route': 'Depósito desconectado. Escolha um lote na mesma malha de ruas.',
  'awaiting_materials': 'Aguardando materiais. Confira estoques, carga em trânsito e fontes.',
  building: 'Em construção. Aguarde os ticks de trabalho configurados.',
  'insufficient-power': 'Capacidade elétrica insuficiente. Confira geração e distribuição.',
  'no-powered-distribution': 'Sem distribuidor energizado ao alcance. Confira a cobertura.',
  serviced: 'Em operação com serviço disponível.',
  'unknown-construction': 'Tipo de construção não configurado.',
  'duplicate-or-empty-id': 'Comando já processado ou sem identificação.',
  'invalid-position': 'Posição inválida. Selecione um lote no mapa.',
  'mapped-roads-fixed': 'Ruas mapeadas são infraestrutura inicial fixa.',
  'existing-road': 'Esta rua já existe.', 'unknown-command': 'Ação não reconhecida.',
};
export function constructionPreview(point: Point, role: string, state: State, rules: Rules) {
  const def = rules.construction[role];
  const reason = def ? placementReason(point, state, rules) : 'unknown-construction';
  const available: Stock = {};
  for (const s of state.stores.filter(s => s.kind === 'depot'))
    for (const [r,n] of Object.entries(s.inventory)) available[r] = (available[r] ?? 0) + n;
  const missing = Object.fromEntries(Object.entries(def?.materials ?? {})
    .map(([r,n]) => [r, Math.max(0,n-(available[r] ?? 0))]).filter(([,n]) => Number(n)>0));
  return { reason, valid: !reason, costs: def?.materials ?? {}, missing, available };
}
export function logisticsReport(state: State, rules: Rules) {
  const stored: Stock = {}, transit: Stock = {}, work: Stock = {}, incorporated: Stock = {};
  const sum = (to: Stock, from: Stock) => { for (const [r,n] of Object.entries(from)) to[r]=(to[r]??0)+n; };
  state.stores.forEach(s => { sum(stored,s.inventory); sum(incorporated,s.incorporated); if(s.work)sum(work,s.work.inputs); });
  state.carriers.forEach(c=>sum(transit,c.cargo));
  // Actual earmarked materials are cargo + inventories delivered to sites.
  // An unladen assigned pickup is demand, not a guaranteed reservation.
  const reserved: Stock = {...transit}, assigned:Stock={};
  state.stores.filter(s=>s.kind==='site').forEach(s=>sum(reserved,s.inventory));
  state.carriers.forEach(c=> { if(c.job) assigned[c.job.resource]=(assigned[c.job.resource]??0)+1; });
  const sites = state.stores.filter(s=>s.kind==='site' && s.status!=='operational');
  const waiting = sites.map(s=>({id:s.id,status:s.status,
    missing: Object.fromEntries(Object.entries(rules.construction[s.construction!].materials)
      .map(([r,n])=>[r,Math.max(0,n-(s.inventory[r]??0)-(s.incorporated[r]??0))]))}));
  const travelTicks = state.carriers.map(c=>({id:c.id,phase:c.phase,target:c.target,
    remainingTicks: c.route.slice(c.waypoint).reduce((a,w,i,rest)=>{
      const p=i===0?c.pos:rest[i-1].point;
      return a+Math.hypot(w.point.x-p.x,w.point.y-p.y)/(w.road?rules.roadSpeed:rules.offroadSpeed)/(rules.tickMs/1000);
    },0)}));
  const blocked = state.carriers.filter(c=>c.phase==='blocked').map(c=>({id:c.id,
    reason: !c.route.length?'no-route': count(c.cargo)>0 ? 'arrival-or-capacity' : 'pickup-or-route'}));
  return { stored,transit,work,incorporated,reserved,assigned,total:total(state),waiting,travelTicks,blocked,
    note:'Reservado é subconjunto de estoque/carga; não somar novamente. Viagem restante é estimativa sem filas.' };
}
export function houseImpact(point: Point, role: string, state: State, rules: Rules) {
  const preview = constructionPreview(point,role,state,rules);
  if(!preview.valid || !rules.services) return null;
  const next = structuredClone(state), def=rules.construction[role];
  let id='preview:house'; while(next.stores.some(s=>s.id===id))id+=':';
  next.stores.push({id,pos:{...point},kind:'site',inventory:{},incorporated:{...def.materials},
    construction:role,status:'operational',capacity:rules.capacity,buildTicks:def.ticks});
  advanceServices(next,rules);
  return { classification:'ESTIMATE_CURRENT_STATE',
    addedDemand:(next.services?.demand??0)-(state.services?.demand??0),
    addedResidents:(next.services?.residents??0)-(state.services?.residents??0),
    affectedExisting:Object.keys(state.services?.buildings??{}).filter(k=>
      next.services?.buildings[k]?.supplied!==state.services?.buildings[k]?.supplied),
    reason:next.services?.buildings[id]?.reason, sourceTick:state.tick,
    note:'Hipótese: obra concluída neste estado. Entregas, novas obras e mudanças posteriores podem invalidar a estimativa.' };
}
export function distributionReport(state:State,rules:Rules) {
  const allocated:Record<string,number>={};
  advanceServices(structuredClone(state),rules,(from,_to,n)=>{allocated[from]=(allocated[from]??0)+n;});
  return state.stores.filter(s=>rules.services?.roles[s.serviceRole??s.construction??'']?.distributionCapacity)
    .map(s=>{const def=rules.services!.roles[s.serviceRole??s.construction!];return {
      id:s.id,range:def.distributionCells,capacity:def.distributionCapacity,allocated:allocated[s.id]??0,
      reason:state.services?.buildings[s.id]?.reason??'unknown'};});
}
