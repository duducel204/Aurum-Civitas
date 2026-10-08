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
import type { MapView } from "@/lib/aurum/map-renderer.ts";

const scenario = scenarioJson as unknown as { rules: Rules; stores: Store[]; carriers: Carrier[]; suggestions: Point[] };
const map = mapJson as unknown as MapData;
const rules = scenario.rules;
const materialLabels: Record<string, string> = { planks: "tábuas", stone: "pedras", metal: "metal", wood: "madeira" };
const reasons: Record<string, string> = {
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
  const [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null), canonical = useRef(state);
  const initial = useRef(state), streams = useRef<Command[][]>([]), nextId = useRef(1);
  const drag = useRef<{ x: number; y: number; view: MapView; moved: boolean } | null>(null);
  const advance = useCallback((commands: Command[] = []) => {
    try {
      const next = step(canonical.current, commands, rules);
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
    if (context) drawItaipu(context, map, state, rules, view, selected, energy);
  }, [state, view, selected, energy]);
  const reason = placementReason(selected, state, rules);
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
    if (placementReason(selected, canonical.current, rules)) { setMessage("Construção bloqueada: " + preview); return; }
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
    setRunning(false);
    const s = createState(rules, scenario.stores, scenario.carriers);
    initial.current = s; canonical.current = s; streams.current = []; nextId.current = 1;
    setState(s); setSelected(scenario.suggestions[0]); setView(initialView);
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
    if (p) { setSelected(p); setView({ center: p, width: 900 }); }
    else setMessage("Selecione no mapa outro lote livre junto às ruas.");
  }
  return (
    <main className="min-h-screen bg-slate-950 p-3 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div><h1 className="text-xl font-medium">AURUM CIVITAS · ITAIPU</h1>
            <p className="text-sm text-slate-300">Ruas prontas · casas · geração · distribuição</p></div>
          <a href="/" className="text-sm text-slate-300 underline">Laboratório de logística</a>
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
          <label className="flex gap-2"><input type="checkbox" checked={energy} onChange={(e) => setEnergy(e.target.checked)} />Rede elétrica</label>
        </div>
        <canvas ref={canvas} width={960} height={660} aria-label="Mapa jogável de Itaipu. Arraste para mover e clique em um lote para selecioná-lo."
          className="block w-full rounded" style={{ touchAction: "none" }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, view, moved: false }; }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const d = drag.current, rect = e.currentTarget.getBoundingClientRect();
            const dx = e.clientX - d.x, dy = e.clientY - d.y;
            if (Math.hypot(dx, dy) > 5) d.moved = true;
            if (d.moved) setView({ ...d.view, center: { x: d.view.center.x - dx * d.view.width / rect.width, y: d.view.center.y - dy * d.view.width / rect.width } });
          }}
          onPointerCancel={() => { drag.current = null; }}
          onPointerUp={(e) => {
            if (drag.current && !drag.current.moved) {
              const rect = e.currentTarget.getBoundingClientRect();
              const p = screenPoint((e.clientX-rect.left)*960/rect.width, (e.clientY-rect.top)*660/rect.height, view,960,660);
              const c = cellAt(p,rules.geography!); if(c) setSelected(cellCenter(c.key,rules.gridSize));
            }
            drag.current = null;
          }} />
        <p className="text-xs text-slate-300">C casa · D depósito · H hidrelétrica · S solar · E subestação · pontos escuros: trabalhadores · linhas tracejadas: circuitos do jogo</p>
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
        <p role="status" className="text-sm text-slate-300">{message}</p>
        <div className="flex flex-wrap gap-2 text-sm">
          <button disabled={busy} onClick={save} className="rounded bg-slate-800 px-3 py-2">Verificar e salvar partida</button>
          <label className="rounded bg-slate-800 px-3 py-2">Carregar partida<input type="file" accept="application/json" disabled={busy} className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return;
            setRunning(false); setBusy(true);
            try {
              const trace = JSON.parse(await file.text()) as Trace;
              const restored = await replay(trace, rules);
              canonical.current = restored; initial.current = trace.initial;
              streams.current = trace.frames.map((f) => f.commands); nextId.current = restored.commandIds.length + 1;
              setState(restored); setMessage("Partida reexecutada e carregada com o mesmo mapa e regras.");
            } catch (error) { setMessage(String(error)); } finally { setBusy(false); e.target.value = ""; }
          }} /></label>
          <button onClick={reset} disabled={busy} className="rounded bg-slate-800 px-3 py-2">Reiniciar</button>
          <span className="self-center text-slate-400">Tick {state.tick} · {state.completed ? "Primeira casa abastecida ✓" : "Missão: primeira casa abastecida"}</span>
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
