import { resetMaskProcessingOptions, setMaskProcessingOptions } from '../mask/mask-processing-options';

type CanvasCommand =
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'delete' }
  | { type: 'duplicate' }
  | { type: 'nudge'; dx: number; dy: number };

const clamp = (value:number,min:number,max:number):number=>Math.min(max,Math.max(min,value));
const isTyping = (target:EventTarget|null):boolean => target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);

export function mountAdvancedCanvasController(root:HTMLElement):void {
  const wrap=root.querySelector<HTMLElement>('[data-role="canvas-wrap"]');
  if(!wrap)return;
  const canvases=[...wrap.querySelectorAll<HTMLCanvasElement>('canvas')];
  const zoomOut=root.querySelector<HTMLButtonElement>('[data-role="zoom-out"]'),zoomIn=root.querySelector<HTMLButtonElement>('[data-role="zoom-in"]'),zoomFit=root.querySelector<HTMLButtonElement>('[data-role="zoom-fit"]'),zoomValue=root.querySelector<HTMLOutputElement>('[data-role="zoom-value"]');
  const padding=root.querySelector<HTMLInputElement>('[data-role="mask-padding"]'),paddingValue=root.querySelector<HTMLOutputElement>('[data-role="mask-padding-value"]'),feather=root.querySelector<HTMLInputElement>('[data-role="mask-feather"]'),featherValue=root.querySelector<HTMLOutputElement>('[data-role="mask-feather-value"]');
  let zoom=1,panX=0,panY=0,space=false,panning=false,startX=0,startY=0,originX=0,originY=0;
  const maxRepairRatio=root.dataset.targetLabel==='object'?.30:.15;
  resetMaskProcessingOptions();

  const apply=():void=>{
    for(const canvas of canvases){canvas.style.transformOrigin='50% 50%';canvas.style.transform=`translate(${panX}px, ${panY}px) scale(${zoom})`;}
    if(zoomValue)zoomValue.value=`${Math.round(zoom*100)}%`;
    wrap.dataset.zoom=String(zoom);
  };
  const setZoom=(next:number):void=>{zoom=clamp(next,.5,4);if(zoom===1){panX=0;panY=0;}apply();};
  const fit=():void=>{zoom=1;panX=panY=0;apply();};
  const syncEffects=(notify=true):void=>{
    const paddingPx=clamp(Number(padding?.value||0),0,64),featherPx=clamp(Number(feather?.value||0),0,32);
    setMaskProcessingOptions({paddingPx,featherPx,maxRepairRatio});
    if(paddingValue)paddingValue.value=`${paddingPx}px`;
    if(featherValue)featherValue.value=`${featherPx}px`;
    if(notify){
      const quality=root.querySelector<HTMLInputElement>('[data-role="quality"]');
      if(quality)quality.dispatchEvent(new Event('input',{bubbles:true}));
    }
  };
  const command=(detail:CanvasCommand):void=>root.dispatchEvent(new CustomEvent<CanvasCommand>('image-canvas-command',{detail,bubbles:false}));

  zoomOut?.addEventListener('click',()=>setZoom(zoom-.25));
  zoomIn?.addEventListener('click',()=>setZoom(zoom+.25));
  zoomFit?.addEventListener('click',fit);
  padding?.addEventListener('input',()=>syncEffects(true));
  feather?.addEventListener('input',()=>syncEffects(true));
  wrap.addEventListener('wheel',event=>{if(!event.ctrlKey&&!event.metaKey)return;event.preventDefault();setZoom(zoom+(event.deltaY<0?.25:-.25));},{passive:false});
  wrap.addEventListener('pointerdown',event=>{if(!space)return;panning=true;startX=event.clientX;startY=event.clientY;originX=panX;originY=panY;wrap.classList.add('is-panning');event.preventDefault();event.stopImmediatePropagation();wrap.setPointerCapture?.(event.pointerId);},true);
  wrap.addEventListener('pointermove',event=>{if(!panning)return;panX=originX+(event.clientX-startX);panY=originY+(event.clientY-startY);apply();event.preventDefault();event.stopImmediatePropagation();},true);
  const stopPan=(event:PointerEvent):void=>{if(!panning)return;panning=false;wrap.classList.remove('is-panning');wrap.releasePointerCapture?.(event.pointerId);event.preventDefault();event.stopImmediatePropagation();};
  wrap.addEventListener('pointerup',stopPan,true);wrap.addEventListener('pointercancel',stopPan,true);

  window.addEventListener('keydown',event=>{
    if(isTyping(event.target))return;
    if(event.code==='Space'){space=true;wrap.classList.add('is-pan-ready');event.preventDefault();return;}
    const meta=event.metaKey||event.ctrlKey;
    if(meta&&event.key.toLowerCase()==='z'){event.preventDefault();if(event.shiftKey)command({type:'redo'});else{const undo=root.querySelector<HTMLButtonElement>('[data-role="undo"]');undo?.click();command({type:'undo'});}return;}
    if(meta&&event.key.toLowerCase()==='d'){event.preventDefault();command({type:'duplicate'});return;}
    if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();command({type:'delete'});return;}
    if(event.key==='0'){event.preventDefault();fit();return;}
    if(event.key==='+'||event.key==='='){event.preventDefault();setZoom(zoom+.25);return;}
    if(event.key==='-'){event.preventDefault();setZoom(zoom-.25);return;}
    const step=event.shiftKey?10:1;
    if(event.key==='ArrowLeft'){event.preventDefault();command({type:'nudge',dx:-step,dy:0});}
    else if(event.key==='ArrowRight'){event.preventDefault();command({type:'nudge',dx:step,dy:0});}
    else if(event.key==='ArrowUp'){event.preventDefault();command({type:'nudge',dx:0,dy:-step});}
    else if(event.key==='ArrowDown'){event.preventDefault();command({type:'nudge',dx:0,dy:step});}
  });
  window.addEventListener('keyup',event=>{if(event.code==='Space'){space=false;panning=false;wrap.classList.remove('is-pan-ready','is-panning');}});
  syncEffects(false);apply();
}
