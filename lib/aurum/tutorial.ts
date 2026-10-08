/** RMD — DEV-25: observed milestones, never a client claim of mission success. */
import type {State} from './rules.ts';
export function firstHouseTutorial(state:State,chosen:boolean) {
  const houses=state.stores.filter(s=>s.kind==='site'&&s.construction==='house');
  const delivered=state.events.some(e=>e.kind==='delivered'&&houses.some(s=>s.id===e.target));
  return [
    {id:'select',label:'Escolha um lote livre junto às ruas e confira a prévia.',done:chosen||houses.length>0},
    {id:'order',label:'Confirme Construir casa; a ordem cria um canteiro.',done:houses.length>0},
    {id:'delivery',label:'Observe os trabalhadores entregarem materiais.',done:delivered},
    {id:'construction',label:'Aguarde materiais completos e os ticks de obra.',done:houses.some(s=>s.status==='operational')},
    {id:'service',label:'Confira energia e moradores: geração precisa chegar por um distribuidor.',done:houses.some(s=>(state.services?.buildings[s.id]?.residents??0)>0)},
  ];
}
