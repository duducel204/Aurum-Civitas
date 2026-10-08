"use client";

/** RM1 + RMD: UI sends commands; drawing never advances or mutates the world. */
import React, { useCallback, useEffect, useRef, useState } from "react";
import fixture from "@/fixtures/demo.json";
import type {
  Rules,
  Store,
  Carrier,
  State,
  Command,
} from "@/lib/aurum/rules.ts";
import { validateRules } from "@/lib/aurum/rules.ts";
import { createState, step } from "@/lib/aurum/simulation.ts";
import { observe } from "@/lib/aurum/observer.ts";
import { record } from "@/lib/aurum/replay.ts";
import { judge } from "@/lib/aurum/judge.ts";

type Scenario = {
  rules: Rules;
  stores: Store[];
  carriers: Carrier[];
  classification?: string;
};
const initialScenario = fixture as Scenario;
export default function GameWorld() {
  const [zoom, setZoom] = useState(100);
  const [scenario, setScenario] = useState<Scenario>(initialScenario);
  const [state, setState] = useState<State>(() =>
    createState(
      initialScenario.rules,
      initialScenario.stores,
      initialScenario.carriers,
    ),
  );
  const [running, setRunning] = useState(false),
    [tool, setTool] = useState<"road" | "build">("road"),
    [message, setMessage] = useState(
      "Cenário experimental: números de exemplo, sem balanceamento aprovado.",
    );
  const [role, setRole] = useState(
    Object.keys(initialScenario.rules.construction)[0],
  );
  const canvas = useRef<HTMLCanvasElement>(null),
    canonicalState = useRef(state),
    queue = useRef<Command[]>([]),
    streams = useRef<Command[][]>([]),
    nextCommand = useRef(1);
  const initial = useRef(
    createState(scenario.rules, scenario.stores, scenario.carriers),
  );
  const advance = useCallback(() => {
    try {
      const commands = queue.current.splice(0);
      const next = step(canonicalState.current, commands, scenario.rules);
      streams.current.push(commands);
      canonicalState.current = next;
      setState(next);
      if (next.completed || next.tick >= scenario.rules.mission.maxTicks)
        setRunning(false);
    } catch (error) {
      setRunning(false);
      setMessage(String(error));
    }
  }, [scenario.rules]);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(advance, scenario.rules.tickMs);
    return () => clearInterval(timer);
  }, [running, scenario.rules.tickMs, advance]);
  function reset(s: Scenario = scenario) {
    setRunning(false);
    validateRules(s.rules);
    const next = createState(s.rules, s.stores, s.carriers);
    initial.current = structuredClone(next);
    canonicalState.current = next;
    queue.current = [];
    streams.current = [];
    nextCommand.current = 1;
    setScenario(s);
    setRole(Object.keys(s.rules.construction)[0]);
    setState(next);
  }
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const view = observe(state),
      size = scenario.rules.gridSize;
    ctx.clearRect(0, 0, 760, 400);
    ctx.fillStyle = "#f5f3ec";
    ctx.fillRect(0, 0, 760, 400);
    ctx.strokeStyle = "#e7e5dc";
    for (let x = 0; x < 760; x += size) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 400);
      ctx.stroke();
    }
    for (let y = 0; y < 400; y += size) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(760, y);
      ctx.stroke();
    }
    for (const key of Object.keys(view.roads)) {
      const [x, y] = key.split(",").map(Number);
      ctx.fillStyle = "#b5a48d";
      ctx.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
    }
    for (const s of view.stores) {
      ctx.fillStyle =
        s.kind === "source"
          ? "#397650"
          : s.kind === "producer"
            ? "#b88449"
            : s.kind === "site"
              ? "#b8b0a0"
              : "#738a9e";
      ctx.fillRect(s.pos.x - 16, s.pos.y - 16, 32, 32);
      ctx.fillStyle = "#23352f";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(s.id, s.pos.x, s.pos.y - 24);
      ctx.fillText(
        Object.entries(s.inventory)
          .map(([r, n]) => r + ":" + n)
          .join(" "),
        s.pos.x,
        s.pos.y + 34,
      );
      if (s.kind === "site") ctx.fillText(s.status, s.pos.x, s.pos.y + 48);
    }
    for (const c of view.carriers) {
      ctx.fillStyle = "#272f31";
      ctx.fillRect(c.pos.x - 4, c.pos.y - 5, 8, 10);
      if (Object.values(c.cargo).some((n) => n > 0)) {
        ctx.fillStyle = "#d2a65a";
        ctx.fillRect(c.pos.x + 4, c.pos.y - 5, 6, 6);
      }
    }
  }, [state, scenario.rules.gridSize]);
  async function verify() {
    setRunning(false);
    try {
      const trace = await record(
        initial.current,
        scenario.rules,
        streams.current,
      );
      const result = await judge(trace);
      setMessage(
        `Replay ${result.status}: ${result.delivered} entregues em ${result.ticks} ticks. Hash ${result.stateHash}`,
      );
      const blob = new Blob(
        [JSON.stringify({ trace, verdict: result }, null, 2)],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "aurum-evidence.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMessage(String(e));
    }
  }
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 font-mono">
      <div className="mx-auto max-w-4xl space-y-4">
        <header>
          <h1 className="text-2xl">AURUM CIVITAS</h1>
          <a href="/itaipu" className="inline-block py-2 text-sm text-emerald-300 underline">Jogar em Itaipu: casas e energia</a>
          <p className="text-sm text-slate-400">
            Materiais → transporte → produção → construção
          </p>
        </header>
        <p className="rounded border border-amber-800 bg-amber-950 p-3 text-xs">
          {scenario.classification ??
            "CONFIGURAÇÃO CARREGADA — validação estrutural não é certificação de balanceamento"}
          <br />
          Bootstrap finito: serraria e dois trabalhadores presentes no exemplo.
          Novas obras consomem materiais entregues.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <button
            onClick={() => setRunning(!running)}
            className="rounded bg-emerald-800 px-3 py-2"
          >
            {running ? "Pausar" : "Rodar"}
          </button>
          <button
            onClick={advance}
            disabled={running}
            className="rounded bg-slate-800 px-3 py-2"
          >
            +1 tick
          </button>
          <button
            onClick={() => reset()}
            className="rounded bg-slate-800 px-3 py-2"
          >
            Reiniciar
          </button>
          <select
            aria-label="Ferramenta"
            value={tool}
            onChange={(e) => setTool(e.target.value as "road" | "build")}
            className="bg-slate-800"
          >
            <option value="road">Estrada</option>
            <option value="build">Construção</option>
          </select>
          <select
            aria-label="Edifício"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-slate-800"
          >
            {Object.keys(scenario.rules.construction).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <button onClick={verify} className="rounded bg-slate-800 px-3 py-2">
            Verificar / exportar replay
          </button>
          <label className="cursor-pointer rounded bg-slate-800 px-3 py-2">
            Carregar cenário JSON
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                try {
                  const file = e.target.files?.[0];
                  if (file) {
                    reset(JSON.parse(await file.text()) as Scenario);
                    setMessage("Configuração carregada e validada.");
                  }
                } catch (error) {
                  setMessage(String(error));
                }
              }}
            />
          </label>
        </div>
        <p className="text-sm">
          Tick {state.tick} · Produzidas{" "}
          {state.produced[scenario.rules.mission.resource] ?? 0} · Entregues{" "}
          {state.stores
            .filter((s) => s.kind === "depot")
            .reduce(
              (n, s) => n + (s.inventory[scenario.rules.mission.resource] ?? 0),
              0,
            )}
          /{scenario.rules.mission.delivered} ·{" "}
          {state.completed ? "MISSÃO CONCLUÍDA" : ""}
        </p>
        <div className="flex items-center gap-3 text-sm" role="group" aria-label="Zoom do mapa">
          <button
            type="button"
            aria-label="Diminuir zoom"
            disabled={zoom <= 50}
            onClick={() => setZoom((value) => Math.max(50, value - 25))}
            className="rounded bg-slate-800 px-3 py-2 disabled:opacity-40"
          >
            −
          </button>
          <output aria-live="polite" className="min-w-14 text-center">{zoom}%</output>
          <button
            type="button"
            aria-label="Aumentar zoom"
            disabled={zoom >= 300}
            onClick={() => setZoom((value) => Math.min(300, value + 25))}
            className="rounded bg-slate-800 px-3 py-2 disabled:opacity-40"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom(100)}
            className="rounded bg-slate-800 px-3 py-2"
          >
            Restaurar 100%
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto rounded border border-slate-700">
        <canvas
          ref={canvas}
          width={760}
          height={400}
          aria-label="Mapa da cidade"
          className="mx-auto block max-w-none"
          style={{ width: `${zoom}%`, height: "auto", imageRendering: "pixelated" }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            queue.current.push({
              id: "ui-" + nextCommand.current++,
              kind: tool,
              x: ((e.clientX - rect.left) * 760) / rect.width,
              y: ((e.clientY - rect.top) * 400) / rect.height,
              ...(tool === "build" ? { role } : {}),
            });
          }}
        />
        </div>
        <p className="break-all text-xs text-slate-400">{message}</p>
        <section className="rounded bg-slate-900 p-3 text-xs">
          {state.events.slice(-8).map((e, i) => (
            <p key={i}>
              [{e.tick}] {e.semantic_id}: {e.kind}{" "}
              {String(e.target ?? e.store ?? e.reason ?? "")}
            </p>
          ))}
        </section>
      </div>
    </main>
  );
}

