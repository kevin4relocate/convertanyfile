type Handle = 'nw'|'ne'|'sw'|'se';
type Rect = {x:number;y:number;width:number;height:number};

const clamp=(value:number,min:number,max:number):number=>Math.min(max,Math.max(min,value));
const numeric=(input:HTMLInputElement):number=>Number(input.value||'0');
const setNumber=(input:HTMLInputElement,value:number):void=>{input.value=String(Math.round(clamp(value,0,100)*100)/100);};
const emit=(input:HTMLInputElement|HTMLSelectElement,event:'input'|'change'):void=>input.dispatchEvent(new Event(event,{bubbles:true}));

export function mountBlurInteractiveEditor(root:HTMLElement):void{
  if(root.dataset.toolId!=='blur-image'||root.dataset.blurEditorReady==='true')return;
  const frame=root.querySelector<HTMLElement>('[data-role="blur-editor-frame"]');
  const image=root.querySelector<HTMLImageElement>('[data-role="source-preview"]');
  const selection=root.querySelector<HTMLElement>('[data-role="blur-selection"]');
  const scope=root.querySelector<HTMLSelectElement>('[data-setting="scope"]');
  const x=root.querySelector<HTMLInputElement>('[data-setting="x"]');
  const y=root.querySelector<HTMLInputElement>('[data-setting="y"]');
  const width=root.querySelector<HTMLInputElement>('[data-setting="width"]');
  const height=root.querySelector<HTMLInputElement>('[data-setting="height"]');
  const buttons=[...root.querySelectorAll<HTMLButtonElement>('[data-blur-scope]')];
  if(!frame||!image||!selection||!scope||!x||!y||!width||!height)return;

  let dragging:false|{pointerId:number;handle?:Handle;startX:number;startY:number;rect:Rect;imageRect:DOMRect}=false;
  const rect=():Rect=>({x:clamp(numeric(x),0,99),y:clamp(numeric(y),0,99),width:clamp(numeric(width),1,100),height:clamp(numeric(height),1,100)});

  const syncButtons=():void=>buttons.forEach(button=>{
    const active=button.dataset.blurScope===scope.value;
    button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));
  });

  const syncSelection=():void=>{
    syncButtons();
    if(scope.value!=='region'||image.hidden||!image.complete||!image.naturalWidth||!image.naturalHeight){selection.hidden=true;return;}
    const imageRect=image.getBoundingClientRect(),frameRect=frame.getBoundingClientRect();
    if(!imageRect.width||!imageRect.height){selection.hidden=true;return;}
    const current=rect();
    const w=Math.min(current.width,100-current.x),h=Math.min(current.height,100-current.y);
    selection.hidden=false;
    selection.style.left=`${imageRect.left-frameRect.left+current.x/100*imageRect.width}px`;
    selection.style.top=`${imageRect.top-frameRect.top+current.y/100*imageRect.height}px`;
    selection.style.width=`${w/100*imageRect.width}px`;
    selection.style.height=`${h/100*imageRect.height}px`;
  };

  const applyRect=(next:Rect):void=>{
    const w=clamp(next.width,2,100),h=clamp(next.height,2,100);
    setNumber(x,clamp(next.x,0,100-w));setNumber(y,clamp(next.y,0,100-h));setNumber(width,w);setNumber(height,h);
    emit(x,'input');requestAnimationFrame(syncSelection);
  };

  buttons.forEach(button=>button.addEventListener('click',()=>{
    const value=button.dataset.blurScope;
    if(value!=='whole'&&value!=='region')return;
    scope.value=value;emit(scope,'change');requestAnimationFrame(syncSelection);
  }));

  selection.addEventListener('pointerdown',(event)=>{
    if(event.button!==0||scope.value!=='region')return;
    const target=(event.target as HTMLElement).closest<HTMLElement>('[data-blur-handle]');
    dragging={pointerId:event.pointerId,handle:target?.dataset.blurHandle as Handle|undefined,startX:event.clientX,startY:event.clientY,rect:rect(),imageRect:image.getBoundingClientRect()};
    selection.setPointerCapture(event.pointerId);event.preventDefault();
  });

  selection.addEventListener('pointermove',(event)=>{
    if(!dragging||event.pointerId!==dragging.pointerId)return;
    const {imageRect,rect:base,handle}=dragging;
    const dx=(event.clientX-dragging.startX)/Math.max(1,imageRect.width)*100;
    const dy=(event.clientY-dragging.startY)/Math.max(1,imageRect.height)*100;
    if(!handle){applyRect({...base,x:base.x+dx,y:base.y+dy});return;}
    let left=base.x,right=base.x+base.width,top=base.y,bottom=base.y+base.height;
    if(handle.includes('w'))left=clamp(base.x+dx,0,right-2);else right=clamp(right+dx,left+2,100);
    if(handle.includes('n'))top=clamp(base.y+dy,0,bottom-2);else bottom=clamp(bottom+dy,top+2,100);
    applyRect({x:left,y:top,width:right-left,height:bottom-top});
  });

  const end=(event:PointerEvent):void=>{if(dragging&&event.pointerId===dragging.pointerId){dragging=false;try{selection.releasePointerCapture(event.pointerId);}catch{}}};
  selection.addEventListener('pointerup',end);selection.addEventListener('pointercancel',end);
  [scope,x,y,width,height].forEach(control=>{control.addEventListener('input',()=>requestAnimationFrame(syncSelection));control.addEventListener('change',()=>requestAnimationFrame(syncSelection));});
  image.addEventListener('load',()=>requestAnimationFrame(syncSelection));
  root.addEventListener('click',()=>requestAnimationFrame(syncSelection));
  window.addEventListener('resize',syncSelection,{passive:true});
  window.addEventListener('pagehide',()=>window.removeEventListener('resize',syncSelection),{once:true});
  root.dataset.blurEditorReady='true';requestAnimationFrame(syncSelection);
}
