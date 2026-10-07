'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { INITIAL_STATE, GameState, updateWorker, Worker, Building, Road } from '@/lib/game-engine';

export default function GameWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const requestRef = useRef<number>(null);
  const previousTimeRef = useRef<number>(null);

  const createLog = useCallback((text: string) => {
    return {
      text,
      timestamp: new Date().toLocaleTimeString(),
    };
  }, []);

  // Initialize logs on mount to avoid hydration mismatch
  useEffect(() => {
    setGameState(prev => ({
      ...prev,
      logs: [
        createLog('[system] initialization complete.'),
        createLog('[system] awaiting instructions...'),
      ],
    }));
  }, [createLog]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Toggle menu
    if (menuPos) {
      setMenuPos(null);
    } else {
      setMenuPos({ x, y });
    }
  };

  const buildLumberjack = (x: number, y: number) => {
    if (gameState.money >= 50) {
      const newBuilding: Building = {
        id: `lumberjack-${Date.now()}`,
        type: 'building',
        pos: { x: x - 30, y: y - 30 },
        width: 60,
        height: 60,
      };

      const newWorker: Worker = {
        id: `worker-${Date.now()}`,
        type: 'worker',
        pos: { x: x, y: y },
        state: 'to_tree',
        targetTreeId: null,
        carrying: false,
        speed: 100,
      };

      setGameState(prev => ({
        ...prev,
        money: prev.money - 50,
        buildings: [...prev.buildings, newBuilding],
        workers: [...prev.workers, newWorker],
        logs: [...prev.logs, createLog(`[system] lumberjack built at ${Math.round(x)},${Math.round(y)}`)].slice(-10),
      }));
    }
    setMenuPos(null);
  };

  const buildRoad = (x: number, y: number) => {
    if (gameState.money >= 10) {
      const newRoad: Road = {
        id: `road-${Date.now()}`,
        type: 'road',
        pos: { x: x - 20, y: y - 20 },
        width: 40,
        height: 40,
      };

      setGameState(prev => ({
        ...prev,
        money: prev.money - 10,
        roads: [...prev.roads, newRoad],
        logs: [...prev.logs, createLog(`[system] road segment placed`)].slice(-10),
      }));
    }
    setMenuPos(null);
  };

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== null) {
      const dt = (time - previousTimeRef.current) / 1000;

      setGameState(prev => {
        let totalWoodGained = 0;
        const newLogs: string[] = [];
        const updatedWorkers = prev.workers.map(w => {
          const { worker, woodGained, log } = updateWorker(w, prev, dt);
          totalWoodGained += woodGained;
          if (log) newLogs.push(log);
          return worker;
        });

        const newWood = prev.wood + totalWoodGained;
        const missionComplete = !prev.missionComplete && newWood >= 20;
        
        const logEntries = newLogs.map(l => createLog(l));
        if (missionComplete) logEntries.push(createLog('[mission] MISSION COMPLETE: 20 wood collected.'));

        return {
          ...prev,
          workers: updatedWorkers,
          wood: newWood,
          missionComplete: prev.missionComplete || missionComplete,
          logs: [...prev.logs, ...logEntries].slice(-10),
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

    // Clear
    ctx.fillStyle = '#f8fafc'; // slate-50
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Roads
    gameState.roads.forEach(r => {
      ctx.fillStyle = '#cbd5e1'; // slate-300
      ctx.fillRect(r.pos.x, r.pos.y, r.width, r.height);
      ctx.strokeStyle = '#94a3b8'; // slate-400
      ctx.lineWidth = 1;
      ctx.strokeRect(r.pos.x, r.pos.y, r.width, r.height);
    });

    // Draw Base
    const base = gameState.base;
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.fillRect(base.pos.x, base.pos.y, base.width, base.height);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.strokeRect(base.pos.x, base.pos.y, base.width, base.height);
    
    ctx.fillStyle = 'black';
    ctx.font = 'bold 16px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BASE', base.pos.x + base.width / 2, base.pos.y + base.height / 2 + 5);

    // Draw Trees
    gameState.trees.forEach(tree => {
      // Trunk
      ctx.fillStyle = '#8b4513'; // saddlebrown
      ctx.fillRect(tree.pos.x - 3, tree.pos.y, 6, 30);
      // Leaves
      ctx.fillStyle = '#228b22'; // forestgreen
      ctx.beginPath();
      ctx.arc(tree.pos.x, tree.pos.y - 10, 22, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Buildings
    gameState.buildings.forEach(b => {
      ctx.fillStyle = '#deb887'; // burlywood
      ctx.fillRect(b.pos.x, b.pos.y, b.width, b.height);
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.pos.x, b.pos.y, b.width, b.height);
    });

    // Draw Workers
    gameState.workers.forEach(w => {
      const { x, y } = w.pos;
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;

      // Head
      ctx.beginPath();
      ctx.arc(x, y - 10, 6, 0, Math.PI * 2);
      ctx.stroke();

      // Body
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x, y + 15);
      ctx.stroke();

      // Arms
      ctx.beginPath();
      ctx.moveTo(x - 10, y + 2);
      ctx.lineTo(x + 10, y + 2);
      ctx.stroke();

      // Legs
      ctx.beginPath();
      ctx.moveTo(x, y + 15);
      ctx.lineTo(x - 8, y + 28);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y + 15);
      ctx.lineTo(x + 8, y + 28);
      ctx.stroke();

      if (w.carrying) {
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x + 10, y - 5, 8, 8);
      }
    });

    // UI Info (Overlay style in Canvas)
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px Consolas, monospace';
    ctx.fillText(`$${gameState.money}`, 20, 40);
    ctx.fillText(`WOOD: ${gameState.wood}`, 20, 70);

    ctx.font = '14px Consolas, monospace';
    ctx.fillText('CLICK TO BUILD', 20, 100);

    if (gameState.missionComplete) {
      ctx.fillStyle = 'black';
      ctx.font = 'bold 40px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('MISSION COMPLETE', canvas.width / 2, 80);
    }

  }, [gameState]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 font-mono">
      <div className="w-full max-w-5xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-t-lg shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <h1 className="text-xl font-bold text-slate-200 tracking-tight ml-2 uppercase">AURUM CIVITAS <span className="text-[10px] font-normal opacity-50 tracking-[0.2em] ml-2 italic">TRANSPORT_MODULE</span></h1>
          </div>
          <div className="text-xs text-emerald-500 opacity-80 animate-pulse flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            LIVE_SIM
          </div>
        </div>

        {/* Main Game Canvas */}
        <div className="relative border-x border-slate-800 shadow-2xl bg-white overflow-hidden group">
          <canvas
            ref={canvasRef}
            width={1000}
            height={700}
            onClick={handleCanvasClick}
            className="cursor-crosshair w-full h-auto"
          />

          {/* Build Menu Overlay */}
          {menuPos && (
            <div 
              className="absolute z-10 bg-slate-900 border border-slate-700 shadow-2xl rounded-md p-1 min-w-[150px] animate-in fade-in zoom-in duration-200"
              style={{ left: menuPos.x, top: menuPos.y }}
            >
              <div className="text-[10px] text-slate-500 px-2 py-1 uppercase font-bold border-b border-slate-800 mb-1">Construct</div>
              <button 
                onClick={() => buildLumberjack(menuPos.x, menuPos.y)}
                disabled={gameState.money < 50}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-30 flex justify-between items-center transition-colors"
              >
                <span>Lumberjack</span>
                <span className="text-emerald-500">$50</span>
              </button>
              <button 
                onClick={() => buildRoad(menuPos.x, menuPos.y)}
                disabled={gameState.money < 10}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-30 flex justify-between items-center transition-colors"
              >
                <span>Road Segment</span>
                <span className="text-emerald-500">$10</span>
              </button>
              <button 
                onClick={() => setMenuPos(null)}
                className="w-full text-left px-3 py-1 text-[10px] text-slate-500 hover:bg-slate-800 transition-colors border-t border-slate-800 mt-1"
              >
                Cancel
              </button>
            </div>
          )}
          
          <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur border border-slate-700 p-3 rounded text-[10px] text-slate-300 pointer-events-none">
            <div className="font-bold mb-1 text-slate-100">LOGISTICS_CORE</div>
            <div>STATUS: {gameState.workers.length > 0 ? "OPERATIONAL" : "IDLE"}</div>
            <div>OFF-ROAD PENALTY: <span className="text-red-400">85%</span></div>
          </div>
        </div>

        {/* Terminal / Logs */}
        <div className="bg-slate-900 border border-slate-800 rounded-b-lg p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">
            <span className="text-slate-400">&gt;</span> event_logs
          </div>
          <div className="space-y-1 h-32 overflow-y-auto custom-scrollbar">
            {gameState.logs.map((log, i) => (
              <div key={i} className="text-xs flex gap-3">
                <span className="text-slate-600">[{log.timestamp}]</span>
                <span className={log.text.includes('worker') ? 'text-blue-400' : log.text.includes('base') ? 'text-emerald-400' : 'text-slate-400'}>
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 text-slate-600 max-w-2xl text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] opacity-50 mb-4">
          github: aurum-civitas // open source project
        </p>
      </div>
    </div>
  );
}
