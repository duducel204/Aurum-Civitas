'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BUILDING_DEFINITIONS,
  BUILD_TIME,
  BuildingRole,
  createBuilding,
  createInitialState,
  createLumberjackWorker,
  GameState,
  GRID_SIZE,
  LUMBERJACK_RADIUS,
  MISSION_PLANKS,
  nextId,
  SAWMILL_TIME,
  updateBuilding,
  updateWorker,
} from '@/lib/game-engine';

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 700;
const ROAD_COST = 5;

export default function GameWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(() => createInitialState());
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const requestRef = useRef<number>(null);
  const previousTimeRef = useRef<number>(null);

  const createLog = useCallback((text: string) => ({
    text,
    timestamp: new Date().toLocaleTimeString(),
  }), []);

  useEffect(() => {
    setGameState(prev => ({
      ...prev,
      logs: [
        createLog('[system] world initialized.'),
        createLog(`[mission] produce ${MISSION_PLANKS} planks.`),
      ],
    }));
  }, [createLog]);

  const restartMission = useCallback(() => {
    const reset = createInitialState();
    reset.logs = [
      createLog('[system] identical world restored.'),
      createLog(`[mission] produce ${MISSION_PLANKS} planks.`),
    ];
    previousTimeRef.current = null;
    setMenuPos(null);
    setGameState(reset);
  }, [createLog]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState.missionComplete) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (event.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (event.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    setMenuPos(menuPos ? null : { x, y });
  };

  const build = (role: BuildingRole, x: number, y: number) => {
    setGameState(prev => {
      const definition = BUILDING_DEFINITIONS[role];
      if (prev.money < definition.cost || prev.missionComplete) return prev;

      const buildingId = nextId(prev, role);
      const building = createBuilding(role, x, y, buildingId);
      const idIncrement = role === 'lumberjack' ? 2 : 1;
      const workers = [...prev.workers];

      if (role === 'lumberjack') {
        workers.push(createLumberjackWorker(building, `worker-${prev.nextEntityId + 1}`));
      }

      return {
        ...prev,
        money: prev.money - definition.cost,
        buildings: [...prev.buildings, building],
        workers,
        nextEntityId: prev.nextEntityId + idIncrement,
        metrics: {
          ...prev.metrics,
          startTime: prev.metrics.startTime ?? Date.now(),
          moneySpent: prev.metrics.moneySpent + definition.cost,
          lumberjacksBuilt: prev.metrics.lumberjacksBuilt + (role === 'lumberjack' ? 1 : 0),
          sawmillsBuilt: prev.metrics.sawmillsBuilt + (role === 'sawmill' ? 1 : 0),
        },
        logs: [
          ...prev.logs,
          createLog(`[build] ${definition.label} placed. construction: ${BUILD_TIME}s`),
        ].slice(-12),
      };
    });

    setMenuPos(null);
  };

  const buildRoad = (x: number, y: number) => {
    setGameState(prev => {
      if (prev.money < ROAD_COST || prev.missionComplete) return prev;

      const gx = Math.floor(x / GRID_SIZE);
      const gy = Math.floor(y / GRID_SIZE);
      const key = `${gx},${gy}`;
      if (prev.roads[key]) return prev;

      return {
        ...prev,
        money: prev.money - ROAD_COST,
        roads: { ...prev.roads, [key]: true },
        metrics: {
          ...prev.metrics,
          startTime: prev.metrics.startTime ?? Date.now(),
          roadsBuilt: prev.metrics.roadsBuilt + 1,
          moneySpent: prev.metrics.moneySpent + ROAD_COST,
        },
        logs: [...prev.logs, createLog('[build] road tile placed.')].slice(-12),
      };
    });

    setMenuPos(null);
  };

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== null) {
      const dt = Math.min((time - previousTimeRef.current) / 1000, 0.1);

      setGameState(prev => {
        if (prev.missionComplete) return prev;

        const logs: string[] = [];
        let planksProducedThisFrame = 0;

        const buildings = prev.buildings.map(building => {
          const result = updateBuilding(building, dt);
          if (result.becameOperational) {
            logs.push(`[build] ${building.role} operational.`);
          }
          if (result.plankProduced) {
            planksProducedThisFrame += 1;
            logs.push('[sawmill] 1 plank produced.');
          }
          return result.building;
        });

        const trees = prev.trees.map(tree => ({
          ...tree,
          pos: { ...tree.pos },
        }));

        const base = {
          ...prev.base,
          inventory: { ...prev.base.inventory },
        };

        const workingState: GameState = {
          ...prev,
          buildings,
          trees,
          base,
        };

        let harvestedThisFrame = 0;

        const workers = prev.workers.map(worker => {
          const result = updateWorker(worker, workingState, dt);

          if (result.harvestedTreeId) {
            const tree = workingState.trees.find(
              item => item.id === result.harvestedTreeId && item.wood > 0
            );

            if (tree) {
              tree.wood -= 1;
              harvestedThisFrame += 1;
            } else {
              result.worker.carrying = false;
              result.worker.resource = null;
              result.worker.targetTreeId = null;
              result.worker.state = 'idle';
            }
          }

          if (result.woodDelivered && result.targetBuildingId) {
            if (result.targetBuildingId === base.id) {
              base.inventory.wood += 1;
            } else {
              const target = buildings.find(b => b.id === result.targetBuildingId);
              if (target) target.inputWood += 1;
            }
          }

          if (result.log) logs.push(result.log);
          return result.worker;
        });

        const depletedNow = workingState.trees.filter(tree => tree.wood <= 0).length;
        const treesRemaining = workingState.trees.filter(tree => tree.wood > 0);
        const previouslyDepleted = prev.metrics.treesDepleted;
        const newlyDepleted = Math.max(0, depletedNow);

        const totalPlanks = prev.metrics.planksProduced + planksProducedThisFrame;
        const missionComplete = totalPlanks >= MISSION_PLANKS;

        if (missionComplete) {
          logs.push(`[mission] complete: ${MISSION_PLANKS} planks produced.`);
        }

        return {
          ...prev,
          base,
          buildings,
          workers,
          trees: treesRemaining,
          missionComplete,
          metrics: {
            ...prev.metrics,
            endTime: missionComplete ? Date.now() : null,
            woodHarvested: prev.metrics.woodHarvested + harvestedThisFrame,
            planksProduced: totalPlanks,
            treesDepleted: previouslyDepleted + newlyDepleted,
          },
          logs: [
            ...prev.logs,
            ...logs.map(createLog),
          ].slice(-12),
        };
      });
    }

    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [createLog]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid(ctx);
    drawRoads(ctx, gameState);
    drawBase(ctx, gameState);
    drawTrees(ctx, gameState);
    drawBuildings(ctx, gameState);
    drawWorkers(ctx, gameState);
    drawHud(ctx, gameState);

    if (menuPos) {
      ctx.beginPath();
      ctx.arc(menuPos.x, menuPos.y, LUMBERJACK_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (gameState.missionComplete) drawMissionComplete(ctx, gameState);
  }, [gameState, menuPos]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 font-mono">
      <div className="w-full max-w-5xl space-y-4">
        <header className="flex items-center justify-between rounded-t-lg border border-slate-800 bg-slate-900 p-4 shadow-xl">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight text-slate-200">
              AURUM CIVITAS
            </h1>
            <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-slate-500">
              minimal economy world · mission 001
            </p>
          </div>
          <button
            onClick={restartMission}
            className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
          >
            Restart same world
          </button>
        </header>

        <div className="relative overflow-hidden border-x border-slate-800 bg-white shadow-2xl">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onClick={handleCanvasClick}
            className="h-auto w-full cursor-crosshair"
          />

          {menuPos && !gameState.missionComplete && (
            <div
              className="absolute z-10 min-w-[180px] rounded-md border border-slate-700 bg-slate-900 p-1 shadow-2xl"
              style={{
                left: `${Math.min((menuPos.x / CANVAS_WIDTH) * 100, 82)}%`,
                top: `${Math.min((menuPos.y / CANVAS_HEIGHT) * 100, 75)}%`,
              }}
            >
              <div className="mb-1 border-b border-slate-800 px-2 py-1 text-[10px] font-bold uppercase text-slate-500">
                Construct
              </div>

              {(Object.keys(BUILDING_DEFINITIONS) as BuildingRole[]).map(role => {
                const definition = BUILDING_DEFINITIONS[role];
                return (
                  <button
                    key={role}
                    onClick={() => build(role, menuPos.x, menuPos.y)}
                    disabled={gameState.money < definition.cost}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-30"
                  >
                    <span>{definition.label}</span>
                    <span className="text-emerald-500">{definition.cost}A</span>
                  </button>
                );
              })}

              <button
                onClick={() => buildRoad(menuPos.x, menuPos.y)}
                disabled={gameState.money < ROAD_COST}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-30"
              >
                <span>Road tile</span>
                <span className="text-emerald-500">{ROAD_COST}A</span>
              </button>

              <button
                onClick={() => setMenuPos(null)}
                className="mt-1 w-full border-t border-slate-800 px-3 py-1 text-left text-[10px] text-slate-500 hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <section className="rounded-b-lg border border-slate-800 bg-slate-900 p-4 shadow-xl">
          <div className="mb-2 border-b border-slate-800 pb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            &gt; world_event_log
          </div>
          <div className="h-32 space-y-1 overflow-y-auto">
            {gameState.logs.map((log, index) => (
              <div key={index} className="flex gap-3 text-xs">
                <span className="text-slate-600">[{log.timestamp}]</span>
                <span className="text-slate-400">{log.text}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1;

  for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }

  for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
}

function drawRoads(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const key of Object.keys(state.roads)) {
    const [gx, gy] = key.split(',').map(Number);
    const x = gx * GRID_SIZE;
    const y = gy * GRID_SIZE;

    ctx.fillStyle = '#d6d3d1';
    ctx.fillRect(x + 4, y + 4, GRID_SIZE - 8, GRID_SIZE - 8);
    ctx.strokeStyle = '#a8a29e';
    ctx.strokeRect(x + 4, y + 4, GRID_SIZE - 8, GRID_SIZE - 8);
  }
}

function drawBase(ctx: CanvasRenderingContext2D, state: GameState) {
  const base = state.base;
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(base.pos.x, base.pos.y, base.width, base.height);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.strokeRect(base.pos.x, base.pos.y, base.width, base.height);

  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('BASE', base.pos.x + base.width / 2, base.pos.y + 34);
  ctx.font = '9px monospace';
  ctx.fillText(
    `WOOD ${base.inventory.wood}`,
    base.pos.x + base.width / 2,
    base.pos.y + 50
  );
}

function drawTrees(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const tree of state.trees) {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(tree.pos.x - 3, tree.pos.y, 6, 18);

    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(tree.pos.x, tree.pos.y - 7, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '8px monospace';
    ctx.fillText(String(tree.wood), tree.pos.x, tree.pos.y - 5);
  }
}

function drawBuildings(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const building of state.buildings) {
    ctx.fillStyle = building.status === 'constructing'
      ? '#cbd5e1'
      : building.role === 'lumberjack'
        ? '#92400e'
        : '#b45309';

    ctx.fillRect(building.pos.x, building.pos.y, building.width, building.height);
    ctx.strokeStyle = '#0f172a';
    ctx.strokeRect(building.pos.x, building.pos.y, building.width, building.height);

    ctx.fillStyle = building.status === 'constructing' ? '#334155' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(
      building.role.toUpperCase(),
      building.pos.x + building.width / 2,
      building.pos.y + 13
    );

    if (building.status === 'constructing') {
      const progress = Math.min(1, building.constructionTimer / BUILD_TIME);
      ctx.fillStyle = '#475569';
      ctx.fillRect(
        building.pos.x + 5,
        building.pos.y + building.height - 9,
        (building.width - 10) * progress,
        4
      );
    }

    if (building.role === 'sawmill' && building.status !== 'constructing') {
      ctx.font = '8px monospace';
      ctx.fillText(
        `W:${building.inputWood} P:${building.outputPlanks}`,
        building.pos.x + building.width / 2,
        building.pos.y + building.height - 8
      );

      if (building.status === 'processing') {
        const progress = Math.min(1, building.processingTimer / SAWMILL_TIME);
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(
          building.pos.x + 5,
          building.pos.y + building.height / 2,
          (building.width - 10) * progress,
          4
        );
      }
    }
  }
}

function drawWorkers(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const worker of state.workers) {
    const { x, y } = worker.pos;

    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y - 7, 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y - 3);
    ctx.lineTo(x, y + 10);
    ctx.moveTo(x - 7, y + 2);
    ctx.lineTo(x + 7, y + 2);
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x - 5, y + 17);
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x + 5, y + 17);
    ctx.stroke();

    if (worker.carrying) {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x + 7, y - 1, 6, 6);
    }

    if (worker.state === 'harvesting') {
      ctx.fillStyle = '#020617';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('chop', x, y - 15);
    }
  }
}

function drawHud(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.fillStyle = '#020617';
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`AURUM: ${state.money}`, 20, 28);
  ctx.fillText(`PLANKS: ${state.metrics.planksProduced}/${MISSION_PLANKS}`, 20, 48);

  ctx.font = '10px monospace';
  ctx.fillText('Roads are preferred by workers when connected.', 20, 68);

  if (state.metrics.startTime && !state.missionComplete) {
    const elapsed = Math.floor((Date.now() - state.metrics.startTime) / 1000);
    ctx.fillText(`TIME: ${elapsed}s`, 20, 88);
  }
}

function drawMissionComplete(ctx: CanvasRenderingContext2D, state: GameState) {
  const elapsed =
    state.metrics.startTime && state.metrics.endTime
      ? Math.floor((state.metrics.endTime - state.metrics.startTime) / 1000)
      : 0;

  ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
  ctx.fillRect(CANVAS_WIDTH / 2 - 155, CANVAS_HEIGHT / 2 - 125, 310, 250);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('MISSION COMPLETE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 88);

  ctx.font = '12px monospace';
  const lines = [
    `Time: ${elapsed}s`,
    `Wood harvested: ${state.metrics.woodHarvested}`,
    `Planks produced: ${state.metrics.planksProduced}`,
    `Money spent: ${state.metrics.moneySpent}`,
    `Road tiles: ${state.metrics.roadsBuilt}`,
    `Trees depleted: ${state.metrics.treesDepleted}`,
    `Lumberjacks: ${state.metrics.lumberjacksBuilt}`,
    `Sawmills: ${state.metrics.sawmillsBuilt}`,
  ];

  lines.forEach((line, index) => {
    ctx.fillText(line, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50 + index * 20);
  });
}
