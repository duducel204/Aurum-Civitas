"use client";

/** RMD: commands and observations of RM1; no separate UI simulation. */
import React, { useCallback, useEffect, useRef, useState } from "react";
import mapJson from "@/fixtures/itaipu-start-map.json";
import scenarioJson from "@/fixtures/itaipu-scenario.json";
import type { MapData } from "@/lib/aurum/geography.ts";
import { cellAt, cellCenter, placementReason } from "@/lib/aurum/geography.ts";
import type { Rules, Store, Carrier, Command, Point } from "@/lib/aurum/rules.ts";
import { createState, step } from "@/lib/aurum/simulation.ts";
import { record, replay } from "@/lib/aurum/replay.ts";
import type { Trace } from "@/lib/aurum/replay.ts";
import { judge } from "@/lib/aurum/judge.ts";
import { drawItaipu, screenPoint } from "@/lib/aurum/map-renderer.ts";
import Link from "next/link";
import RegionalPanels from "./regional-panels";
import { firstHouseTutorial } from "@/lib/aurum/tutorial.ts";
import { guidance, constructionPreview } from "@/lib/aurum/presentation.ts";
import { boundedView, minimapPoint, typingTarget } from "@/lib/aurum/camera.ts";
import { packSave, restoreSave, persistSave, slotKey } from "@/lib/aurum/local-save.ts";
import { defaultLayers } from "@/lib/aurum/map-renderer.ts";
import type { MapLayers } from "@/lib/aurum/map-renderer.ts";
import type { MapView } from "@/lib/aurum/map-renderer.ts";

const scenario = scenarioJson as unknown as { rules: Rules; stores: Store[]; carriers: Carrier[]; suggestions: Point[] };
const map = mapJson as unknown as MapData;
const rules = scenario.rules;
const materialLabels: Record<string, string> = { planks: "tábuas", stone: "pedras", metal: "metal", wood: "madeira" };
const reasons: Record<string, string> = {
  ...guidance,
  "outside-map": "Fora do mapa", "mapped-terrain-blocked": "Área mapeada preservada",
  "occupied-cell": "Lote ocupado", "no-road-access": "Lote sem acesso à rua",
  "no-delivery-route": "Sem rota de entrega desde o depósito", "awaiting_materials": "Aguardando materiais",
  "building": "Em construção", "serviced": "Em operação",
  "insufficient-power": "Energia ou capacidade insuficiente", "no-powered-distribution": "Falta conexão elétrica",
  "unknown-construction": "Tipo de construção desconhecido", "duplicate-or-empty-id": "Comando duplicado ou sem identificação",
  "invalid-position": "Posição inválida", "mapped-roads-fixed": "Ruas mapeadas não podem ser alteradas",
  "existing-road": "Rua já existente", "unknown-command": "Comando desconhecido",
};
const depot = scenario.stores.find((s) => s.kind === "depot")!;
const initialView: MapView = { center: { ...depot.pos }, width: 900 };
export default function ItaipuWorld() {
  const [state, setState] = useState(() => createState(rules, scenario.stores, scenario.carriers));
  const [running, setRunning] = useState(false), [role, setRole] = useState("house");
  const [selected, setSelected] = useState<Point>(scenario.suggestions[0]);
  const [view, setView] = useState<MapView>(initialView), [energy, setEnergy] = useState(true);
  const [message, setMessage] = useState("Construa no lote sugerido ou selecione outro lote junto às ruas.");
  const [busy, setBusy] = useState(true);
  const [showTutorial,setShowTutorial]=useState(true),[chosen,setChosen]=useState(false);
  const [layers, setLayers] = useState<MapLayers>(defaultLayers);
  const [help, setHelp] = useState(false), [selectionActive, setSelectionActive] = useState(true);
  const [preferences, setPreferences] = useState({ volume: 0, interfaceScale: 100, reducedMotion: false });
  const [saveStatus, setSaveStatus] = useState("Verificando save local…");
  const mini = useRef<HTMLCanvasElement>(null), audio = useRef<AudioContext | null>(null);
  const ready = useRef(false), lastWritten = useRef(-1), eventCursor = useRef(state.events.length);
  const persistenceError = useRef(false);
  const profile=useRef({simulationMs:0,renderMs:0,tickBudgetMs:rules.tickMs,delayed:false});

  const canvas = useRef<HTMLCanvasElement>(null), canonical = useRef(state);
  const initial = useRef(state), streams = useRef<Command[][]>([]), nextId = useRef(1);
  const drag = useRef<{ x: number; y: number; view: MapView; moved: boolean } | null>(null);
  const advance = useCallback((commands: Command[] = []) => {
    try {
      const started=performance.now();
      const next = step(canonical.current, commands, rules);
      profile.current.simulationMs=performance.now()-started;
      profile.current.delayed=profile.current.simulationMs>rules.tickMs;
      canonical.current = next; streams.current.push(commands); setState(next);
      if (next.tick >= rules.mission.maxTicks) setRunning(false);
      return next;
    } catch (e) { setRunning(false); setMessage(String(e)); return null; }
  }, []);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => advance(), rules.tickMs);
    return () => clearInterval(timer);
  }, [running, advance]);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (context) {const started=performance.now();drawItaipu(context, map, state, rules, view, selectionActive ? selected : null, energy, layers);profile.current.renderMs=performance.now()-started;}
  }, [state, view, selected, energy, layers, selectionActive]);
  function moveView(v: MapView) { setView(boundedView(v, map.metadata.widthM, map.metadata.heightM)); }
  function selectPoint(p: Point) { setSelected(p); setChosen(true); setSelectionActive(true); moveView({ center: p, width: view.width }); }
  function updatePreferences(next: typeof preferences) {
    setPreferences(next);
    try { localStorage.setItem("aurum:preferences:v1", JSON.stringify(next)); }
    catch { setMessage("Não foi possível salvar preferências; a partida foi preservada."); }
  }
  useEffect(() => {
    let cancelled = false;
    async function loadLocal() {
      try {
        const rawPrefs = localStorage.getItem("aurum:preferences:v1");
        if(rawPrefs) {
          let p;
          try {p=JSON.parse(rawPrefs);}catch{p=null;}
          if(p && Number.isFinite(p.volume) && p.volume >= 0 && p.volume <= 100 && [100,115,130].includes(p.interfaceScale) && typeof p.reducedMotion === "boolean")
            setPreferences(p);
        }
        const raw = localStorage.getItem(slotKey);
        if(raw) {
          const restored = await restoreSave(JSON.parse(raw), rules);
          if(cancelled)return;
          canonical.current = restored.state; initial.current = restored.save.initial;
          streams.current = restored.save.commands; nextId.current = restored.state.commandIds.length + 1;
          eventCursor.current = restored.state.events.length;
          setState(restored.state); setMessage("Save local verificado e recuperado. Partida pausada.");
        }
        if(!cancelled) {ready.current=true;setSaveStatus("Autosave local ativo — slot v1, com cópia anterior.");}
      } catch(e) { if(!cancelled) {setSaveStatus("Save local não substituído: " + String(e));setMessage("Exporte o original ou carregue uma partida compatível. Reiniciar abre uma nova sessão.");} }
      finally {if(!cancelled)setBusy(false);}
    }
    void loadLocal();
    return () => {cancelled=true;};
  }, []);
  const persist = useCallback(async () => {
      if(!ready.current)return;
      const origin=initial.current, snapshot=canonical.current;
      try {
        const saved=await packSave(origin,rules,streams.current,snapshot);
        if(initial.current!==origin || snapshot.tick<lastWritten.current)return;
        persistSave(localStorage,saved); lastWritten.current=snapshot.tick;
        persistenceError.current=false;setSaveStatus(`Autosave local · tick ${snapshot.tick} · ${saved.finalHash.slice(0,12)} · compatibilidade ${rules.version}`);
      } catch(e) {persistenceError.current=true;setSaveStatus("Falha no autosave (espaço/permissão). Exporte a partida: " + String(e));}
  }, []);
  useEffect(() => {
    const timer=setInterval(()=>void persist(),5000);
    return () => clearInterval(timer);
  }, [persist]);
  useEffect(() => { if(!running)void persist(); }, [running,state,persist]);
  useEffect(() => {
    const events=state.events.slice(eventCursor.current);eventCursor.current=state.events.length;
    if(!events.length || preferences.reducedMotion || !preferences.volume || !audio.current)return;
    if(!events.some(e=>["command-rejected","construction-completed","service-changed"].includes(e.kind)))return;
    const context=audio.current,osc=context.createOscillator(),gain=context.createGain();
    osc.frequency.value=events.some(e=>e.kind==="command-rejected")?220:660;
    gain.gain.setValueAtTime(preferences.volume/100*.06,context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.12);
    osc.connect(gain);gain.connect(context.destination);osc.start();osc.stop(context.currentTime+.13);
  }, [state,preferences]);
  useEffect(() => {
    const key=(e:KeyboardEvent)=>{
      if(e.ctrlKey||e.metaKey||e.altKey||typingTarget(e.target))return;
      const distance=view.width*.1;
      if(e.code==="Space"){e.preventDefault();setRunning(v=>!v);}
      else if(e.key==="Escape"){setSelectionActive(false);setHelp(false);}
      else if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)){
        e.preventDefault();moveView({...view,center:{x:view.center.x+(e.key==="ArrowLeft"?-distance:e.key==="ArrowRight"?distance:0),y:view.center.y+(e.key==="ArrowUp"?-distance:e.key==="ArrowDown"?distance:0)}});
      }else if(["1","2","3"].includes(e.key))setRole(["house","solar","substation"][Number(e.key)-1]);
    };
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  }, [view]);
  useEffect(() => {
    const ctx=mini.current?.getContext("2d");if(!ctx)return;
    const width=Math.max(map.metadata.widthM,map.metadata.heightM*240/150);
    drawItaipu(ctx,map,state,rules,{center:{x:map.metadata.widthM/2,y:map.metadata.heightM/2},width},null,false,layers);
    const scale=240/width,left=map.metadata.widthM/2-width/2,top=map.metadata.heightM/2-150/scale/2;
    ctx.strokeStyle="#172a22";ctx.lineWidth=2;
    ctx.strokeRect((view.center.x-view.width/2-left)*scale,(view.center.y-view.width*660/960/2-top)*scale,view.width*scale,view.width*660/960*scale);
  }, [state,view,layers]);
  const validation = constructionPreview(selected,role,state,rules);
  const reason = selectionActive ? validation.reason : "Selecione um lote no mapa ou na lista.";
  const cell = cellAt(selected, rules.geography!);
  const selectedStore = state.stores.find((s) => cellAt(s.pos, rules.geography!)?.key === cell?.key);
  const selectedService = selectedStore ? state.services?.buildings[selectedStore.id] : null;
  const stock = state.stores.find((s) => s.kind === "depot")!.inventory;
  const costs = rules.construction[role].materials;
  const missing = Object.entries(costs).filter(([r, n]) => (stock[r] ?? 0) < n);
  const preview = reason ? (reasons[reason] ?? reason) : missing.length
    ? `Obra possível, mas aguardará: ${missing.map(([r, n]) => `${n - (stock[r] ?? 0)} ${materialLabels[r] ?? r}`).join(", ")}`
    : "Lote acessível e materiais disponíveis no depósito";
  const production = state.stores.find((s) => s.id === "itaipu:sawmill-1");
  const forest = state.stores.find((s) => s.id === "itaipu:forest-source-1");
  function build() {
    if (!selectionActive || placementReason(selected, canonical.current, rules)) { setMessage("Construção bloqueada: " + preview); return; }
    let id = "itaipu-ui-" + nextId.current++;
    while (canonical.current.commandIds.includes(id)) id = "itaipu-ui-" + nextId.current++;
    const next = advance([{ id, kind: "build", role, ...selected }]);
    if (next) {
      const rejected = next.events.find((e) => e.tick === next.tick && e.commandId === id && e.kind === "command-rejected");
      setMessage(rejected ? `Comando rejeitado: ${reasons[String(rejected.reason)] ?? rejected.reason}` :
        missing.length ? "Canteiro criado. Aguarda materiais da cadeia produtiva." : "Obra aberta. Os trabalhadores entregam os materiais pelas ruas existentes.");
      setRunning(true);
    }
  }
  function reset() {
    if (!window.confirm("Reiniciar esta partida? O save anterior permanece na cópia local.")) return;
    setRunning(false);
    ready.current=true; lastWritten.current=-1; eventCursor.current=0;
    const s = createState(rules, scenario.stores, scenario.carriers);
    initial.current = s; canonical.current = s; streams.current = []; nextId.current = 1;
    setState(s); setChosen(false); setSelectionActive(true); setSelected(scenario.suggestions[0]); setView(initialView);
    setMessage("Cenário reiniciado com o mesmo mapa e materiais iniciais.");
  }
  async function save() {
    setRunning(false); setBusy(true);
    try {
      const trace = await record(initial.current, rules, streams.current);
      const verdict = await judge(trace);
      setMessage(`Replay íntegro · ${verdict.poweredHouses ?? 0} casas abastecidas · ${verdict.residents ?? 0} moradores.`);
      const url = URL.createObjectURL(new Blob([JSON.stringify(trace)], { type: "application/json" }));
      const a = document.createElement("a"); a.href = url; a.download = "aurum-itaipu-partida.json"; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setMessage(String(e)); } finally { setBusy(false); }
  }
  function nextLot() {
    const p = scenario.suggestions.find((p) => !placementReason(p, canonical.current, rules));
    if (p) { selectPoint(p); moveView({ center: p, width: 900 }); }
    else setMessage("Selecione no mapa outro lote livre junto às ruas.");
  }
  return (
    <main className="min-h-screen bg-slate-950 p-3 text-slate-100 sm:p-6" style={{zoom:preferences.interfaceScale/100}}>
      <div className="mx-auto max-w-6xl space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div><h1 className="text-xl font-medium">AURUM CIVITAS · ITAIPU</h1>
            <p className="text-sm text-slate-300">Ruas prontas · casas · geração · distribuição</p></div>
          <Link href="/" className="text-sm text-slate-300 underline">Laboratório de logística</Link>
        </header>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-live="polite">
          <span>Moradores <strong>{state.services?.residents ?? 0}/{state.services?.housing ?? 0}</strong></span>
          <span>Energia <strong>{state.services?.supplied ?? 0}/{state.services?.demand ?? 0}</strong> atendida</span>
          <span>Geração <strong>{state.services?.generation ?? 0}</strong> u/tick</span>
          <span>Depósito {Object.entries(stock).map(([r, n]) => `${n} ${materialLabels[r] ?? r}`).join(" · ")}</span>
          {forest && <span>Madeira na fonte <strong>{forest.inventory.wood ?? 0}</strong></span>}
          {production && <span>Serraria <strong>{production.inventory.planks ?? 0}</strong> tábuas · {production.work ? "produzindo" : "aguardando madeira"}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button className="rounded bg-emerald-800 px-3 py-2" disabled={busy} onClick={() => setRunning(!running)}>{running ? "Pausar" : "Rodar"}</button>
          <button className="rounded bg-slate-800 px-3 py-2" disabled={running || busy} onClick={() => advance()}>+1 tick</button>
          <button className="rounded bg-slate-800 px-3 py-2" onClick={() => setView({ center: { x: map.metadata.widthM / 2, y: map.metadata.heightM / 2 }, width: map.metadata.heightM * 960 / 660 })}>Vista regional</button>
          <button className="rounded bg-slate-800 px-3 py-2" onClick={() => setView(initialView)}>Voltar ao núcleo</button>
          <button className="rounded bg-slate-800 px-3 py-2" aria-label="Aumentar zoom" onClick={() => setView((v) => ({ ...v, width: Math.max(240, v.width / 1.5) }))}>+</button>
          <button className="rounded bg-slate-800 px-3 py-2" aria-label="Diminuir zoom" onClick={() => setView((v) => ({ ...v, width: Math.min(10000, v.width * 1.5) }))}>−</button>
          {([['←',-1,0,'Mover câmera para a esquerda'],['↑',0,-1,'Mover câmera para cima'],['↓',0,1,'Mover câmera para baixo'],['→',1,0,'Mover câmera para a direita']] as const).map(([glyph,x,y,label])=><button key={label} className="rounded bg-slate-800 px-3 py-2" aria-label={label} onClick={()=>moveView({...view,center:{x:view.center.x+x*view.width*.1,y:view.center.y+y*view.width*.1}})}>{glyph}</button>)}
          <button className="rounded bg-slate-800 px-3 py-2" onClick={()=>setSelectionActive(false)}>Cancelar seleção</button>
          <label className="flex gap-2"><input type="checkbox" checked={energy} onChange={(e) => setEnergy(e.target.checked)} />Rede elétrica</label>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm" role="group" aria-label="Camadas do mapa">
          {(["terrain","resources","buildings"] as const).map(k=><label key={k} className="flex gap-2"><input type="checkbox" checked={layers[k]} onChange={e=>setLayers({...layers,[k]:e.target.checked})}/>{{terrain:"Terreno e ruas",resources:"Recursos e trabalhadores",buildings:"Edifícios"}[k]}</label>)}
          <button className="rounded bg-slate-800 px-3" onClick={()=>{setHelp(true);setRunning(false);}}>Pausa e ajuda</button>
        </div>
        {help&&<section className="rounded border border-slate-500 bg-slate-900 p-4" role="dialog" aria-label="Pausa e ajuda">
          <h2>Partida pausada</h2><p>Espaço: pausar/rodar · setas: câmera · 1 casa / 2 solar / 3 subestação · Esc: cancelar seleção. Atalhos não atuam sobre campos e botões.</p>
          <p>Selecione um lote, confira custo/acesso e confirme Construir. Entregas precedem obra; energia exige distribuição. Salvar/carregar e Reiniciar estão abaixo do mapa.</p>
          <button className="rounded bg-emerald-800 px-3" onClick={()=>{setHelp(false);setRunning(true);}}>Continuar</button>
          <button className="ml-2 rounded bg-slate-800 px-3" onClick={()=>setHelp(false)}>Fechar ajuda mantendo pausa</button>
        </section>}
        <canvas ref={canvas} width={960} height={660} aria-label="Mapa jogável de Itaipu. Arraste para mover e clique em um lote para selecioná-lo."
          className="block w-full rounded" tabIndex={0} style={{ touchAction: "none" }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, view, moved: false }; }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const d = drag.current, rect = e.currentTarget.getBoundingClientRect();
            const dx = e.clientX - d.x, dy = e.clientY - d.y;
            if (Math.hypot(dx, dy) > 5) d.moved = true;
            if (d.moved) moveView({ ...d.view, center: { x: d.view.center.x - dx * d.view.width / rect.width, y: d.view.center.y - dy * d.view.width / rect.width } });
          }}
          onPointerCancel={() => { drag.current = null; }}
          onPointerUp={(e) => {
            if (drag.current && !drag.current.moved) {
              const rect = e.currentTarget.getBoundingClientRect();
              const p = screenPoint((e.clientX-rect.left)*960/rect.width, (e.clientY-rect.top)*660/rect.height, view,960,660);
              const c = cellAt(p,rules.geography!); if(c) selectPoint(cellCenter(c.key,rules.gridSize));
            }
            drag.current = null;
          }} />
        <div className="flex flex-wrap gap-3">
          <div><p className="text-xs">Minimapa — clique para mover a câmera</p>
            <canvas ref={mini} width={240} height={150} aria-label="Minimapa de Itaipu" className="rounded border border-slate-600" onClick={e=>{
              const rect=e.currentTarget.getBoundingClientRect(),width=Math.max(map.metadata.widthM,map.metadata.heightM*240/150),scale=240/width;
              const p=minimapPoint(e.clientX-rect.left,e.clientY-rect.top,rect.width,rect.height,width,width*150/240);
              moveView({...view,center:{x:p.x+map.metadata.widthM/2-width/2,y:p.y+map.metadata.heightM/2-150/scale/2}});
            }}/></div>
          <fieldset className="flex flex-wrap items-center gap-3 text-sm"><legend>Preferências locais</legend>
            <label>Som <input aria-label="Volume" type="range" min={0} max={100} value={preferences.volume} onChange={e=>{if(!audio.current)audio.current=new AudioContext();void audio.current.resume();updatePreferences({...preferences,volume:Number(e.target.value)});}}/></label>
            <label>Interface <select aria-label="Tamanho da interface" className="rounded bg-slate-800 p-2" value={preferences.interfaceScale} onChange={e=>updatePreferences({...preferences,interfaceScale:Number(e.target.value)})}>{[100,115,130].map(n=><option key={n} value={n}>{n}%</option>)}</select></label>
            <label><input type="checkbox" checked={preferences.reducedMotion} onChange={e=>updatePreferences({...preferences,reducedMotion:e.target.checked})}/> Reduzir movimento e sinais</label>
          </fieldset>
        </div>
        <p className="text-xs text-slate-300">F fonte · M serraria · C casa · D depósito · H hidrelétrica · S solar · E subestação · pontos escuros: trabalhadores · linhas tracejadas: circuitos do jogo</p>
        <div className="flex flex-wrap items-center gap-3 rounded bg-slate-900 p-3 text-sm">
          <label>Construção <select aria-label="Construção" className="ml-2 rounded bg-slate-800 p-2" value={role} onChange={(e) => setRole(e.target.value)}>
            {Object.keys(rules.construction).map((r) => <option value={r} key={r}>{rules.services!.roles[r].label}</option>)}
          </select></label>
          <span>{Object.entries(costs).map(([r,n]) => `${n} ${materialLabels[r]}`).join(" + ")}</span>
          <button disabled={!!reason || busy} onClick={build} className="rounded bg-emerald-800 px-3 py-2 disabled:opacity-40">Construir {rules.services!.roles[role].label.toLowerCase()}</button>
          <button onClick={nextLot} className="rounded bg-slate-800 px-3 py-2">Lote sugerido</button>
          <span aria-live="polite">Lote {cell?.key ?? "—"} · {selectedStore ? reasons[selectedService?.reason ?? selectedStore.status] ?? selectedStore.status : reasons[reason] ?? "Livre com acesso"}
            {selectedService?.housing ? ` · ${selectedService.residents}/${selectedService.housing} moradores · ${selectedService.supplied}/${selectedService.demand} energia` : ""}</span>
        </div>
        <p className="text-sm text-slate-300" aria-live="polite">Prévia: {preview}. {role === "house" ? "Energia será avaliada após a obra; uma casa pode existir sem atendimento elétrico." : ""}</p>
        <p className="text-sm">{guidance[reason]??guidance[selectedService?.reason??""]??"Confira materiais e atendimento antes de expandir."}</p>
        {showTutorial?<section className="rounded bg-slate-900 p-3 text-sm" aria-label="Tutorial da primeira casa">
          <h2>Primeira casa — etapas observadas</h2>
          <ol>{firstHouseTutorial(state,chosen).map(stage=><li key={stage.id}>{stage.done?"✓":"○"} {stage.label}</li>)}</ol>
          <button className="mt-2 rounded bg-slate-800 px-3" onClick={()=>setShowTutorial(false)}>Pular tutorial</button>
        </section>:<button className="rounded bg-slate-800 px-3" onClick={()=>setShowTutorial(true)}>Mostrar tutorial</button>}
        <RegionalPanels state={state} rules={rules} selectedStore={selectedStore} selected={selected} role={role} suggestions={scenario.suggestions} onSelect={selectPoint}/>
        <p role="status" className="text-sm text-slate-300">{message}</p>
        <div className="flex flex-wrap gap-2 text-sm">
          <button disabled={busy} onClick={save} className="rounded bg-slate-800 px-3 py-2">Verificar e salvar partida</button>
          <label className="rounded bg-slate-800 px-3 py-2">Carregar partida<input type="file" accept="application/json" disabled={busy} className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return;
            setRunning(false); setBusy(true);
            try {
              const parsed = JSON.parse(await file.text());
              let trace:Trace,restored;
              if(parsed.format==="AC-LOCAL-1") {
                const verified=await restoreSave(parsed,rules);
                trace=await record(verified.save.initial,rules,verified.save.commands);restored=verified.state;
              } else {trace=parsed as Trace;restored=await replay(trace,rules);}
              ready.current=true;lastWritten.current=-1;eventCursor.current=restored.events.length;
              canonical.current = restored; initial.current = trace.initial;
              streams.current = trace.frames.map((f) => f.commands); nextId.current = restored.commandIds.length + 1;
              setState(restored); setMessage("Partida reexecutada e carregada com o mesmo mapa e regras.");
            } catch (error) { setMessage(String(error)); } finally { setBusy(false); e.target.value = ""; }
          }} /></label>
          <button onClick={reset} disabled={busy} className="rounded bg-slate-800 px-3 py-2">Reiniciar</button>
          <span className="self-center text-slate-400">Tick {state.tick} · {state.completed ? "Primeira casa abastecida ✓" : "Missão: primeira casa abastecida"}</span>
        </div>
        <p className="text-xs break-all" role="status">{saveStatus}</p>
        <div className="flex flex-wrap gap-2 text-sm">
          <button className="rounded bg-slate-800 px-3" onClick={()=>{
            const raw=localStorage.getItem(slotKey);if(!raw){setMessage("Nenhum save local disponível.");return;}
            const url=URL.createObjectURL(new Blob([raw],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="aurum-save-original.json";a.click();URL.revokeObjectURL(url);
          }}>Exportar save original</button>
          <button className="rounded bg-slate-800 px-3" onClick={()=>{
            const diagnostic={format:"AC-DIAGNOSTIC-1",rulesVersion:rules.version,mapVersion:state.mapVersion,tick:state.tick,saveStatus,profile:{...profile.current,note:"Medição local do último tick/render. Se houver atraso, nenhum efeito é pulado. Rotas medidas separadamente no benchmark."},events:state.events.slice(-20)};
            const url=URL.createObjectURL(new Blob([JSON.stringify(diagnostic,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="aurum-diagnostico.json";a.click();URL.revokeObjectURL(url);
          }}>Exportar diagnóstico</button>
        </div>
        <details className="text-xs text-slate-300"><summary>Eventos da região</summary>
          {state.events.slice(-8).map((e,i) => <p key={i}>[{e.tick}] {e.kind} · {String(e.store ?? e.target ?? e.reason ?? "")}</p>)}
        </details>
        <footer className="space-y-1 text-xs text-slate-400">
          <p>© OpenStreetMap contributors · ODbL 1.0 · fonte {rules.geography!.sourceTimestamp}</p>
          <p>Cenário experimental. Materiais, capacidade e energia são parâmetros do jogo. Lotes virtuais e circuitos simulados.</p>
        </footer>
      </div>
    </main>
  );
}
