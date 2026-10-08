/** RMD — DEV-14/19: bounded camera, shared by buttons, minimap and keyboard. */
import type { MapView } from './map-renderer.ts';
import type { Point } from './rules.ts';
export function boundedView(view:MapView, widthM:number, heightM:number):MapView {
  return {width:Math.max(240,Math.min(10000,view.width)),center:{
    x:Math.max(0,Math.min(widthM,view.center.x)),y:Math.max(0,Math.min(heightM,view.center.y))}};
}
export function minimapPoint(x:number,y:number,width:number,height:number,widthM:number,heightM:number):Point {
  return {x:Math.max(0,Math.min(1,x/width))*widthM,y:Math.max(0,Math.min(1,y/height))*heightM};
}
export function typingTarget(target:EventTarget|null):boolean {
  if(!(target instanceof HTMLElement))return false;
  return target.isContentEditable || !!target.closest('input,select,textarea,button,summary,a,[role="textbox"]');
}
