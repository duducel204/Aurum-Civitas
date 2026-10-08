/** RM4/RMD — DEV-31/32/68: compact local journal, verified before replacement. */
import type { Command, Rules, State } from './rules.ts';
import { canonical, validateRules } from './rules.ts';
import { hash } from './replay.ts';
import { step } from './simulation.ts';
export type LocalSave = {
  format:'AC-LOCAL-1'; rules:Rules; initial:State; commands:Command[][];
  frameCount:number; initialHash:string; finalHash:string;
};
export const slotKey='aurum:itaipu:autosave:v1';
export async function packSave(initial:State, rules:Rules, commands:Command[][], final:State):Promise<LocalSave> {
  return {format:'AC-LOCAL-1',rules:structuredClone(rules),initial:structuredClone(initial),
    commands:structuredClone(commands),frameCount:commands.length,
    initialHash:await hash(initial),finalHash:await hash(final)};
}
export async function restoreSave(value:unknown, expected:Rules):Promise<{state:State; save:LocalSave}> {
  const s=value as LocalSave;
  if(!s || s.format!=='AC-LOCAL-1' || !Array.isArray(s.commands) ||
    s.commands.length!==s.frameCount || !Number.isSafeInteger(s.frameCount) || s.frameCount<0 ||
    canonical(validateRules(s.rules))!==canonical(expected) || await hash(s.initial)!==s.initialHash)
    throw Error('Save incompatível: formato, regras, mapa ou origem divergentes. A sessão atual foi preservada.');
  let state=structuredClone(s.initial);
  for(const commands of s.commands) {
    if(!Array.isArray(commands))throw Error('Save inválido: comandos ausentes.');
    state=step(state,commands,expected);
  }
  if(await hash(state)!==s.finalHash)throw Error('Save inválido: checkpoint final divergente. Original preservado.');
  return {state,save:s};
}
export type StoragePort=Pick<Storage,'getItem'|'setItem'>;
export function persistSave(storage:StoragePort, save:LocalSave):void {
  const previous=storage.getItem(slotKey);
  // Write backup first. If quota fails, the previous primary remains intact.
  if(previous)storage.setItem(slotKey+':previous',previous);
  storage.setItem(slotKey,JSON.stringify(save));
}
