type Handle = 'nw'|'ne'|'sw'|'se';
type Rect = {x:number;y:number;width:number;height:number};

const clamp=(value:number,min:number,max:number):number=>Math.min(max,Math.max(min,value));
const numeric=(input:HTMLInputElement):number=>Number(input.value||'0');
const setNumber=(input:HTMLInputElement,value:number):void=>{input.value=String(Math.round(clamp(value,0,100)*100)/100);};
const emit=(input:HTMLInputElement|HTMLSelectElement,event:'input'|'change'):void=>input.dispatchEvent(new Event(event,{bubbles:true}));

function makeScopeButton(value:'whole'|'region',title:string,copy:string):HTMLButtonElement{
  const button=document.createElement('button');
  button.type='button';button.className='blur-scope-button';button.dataset.blurScope=value;button.setAttribute('aria-pressed','false');
  const strong=document.createElement('strong');strong.textContent=title;
  const small=document.createElement('small');small.textContent=copy;
  button.append(strong,small);return button;
}

function makeHandle(handle:Handle):HTMLButtonElement{
  const button=document.createElement('button');button.type='button';button.className=`blur-handle blur-handle--${handle}`;button.dataset.blurHandle=handle;
  const names:{[key in Handle]:string}={nw:'top left',ne:'top right',sw:'bottom left',se:'bottom right'};
  button.setAttribute('aria-label',`Resize blur area from ${names[handle]}`);return button;
}

export function mountBlurInteractiveEditor(root:HTMLElement):void{
  if(root.dataset.toolId!=='blur-image'||root.dataset.blurEditorReady==='true')return;
  const image=root.querySelector<HTMLImageElement>('[data-role="source-preview"]');
  const frame=image?.closest<HTMLElement>('.image-preview-panel__frame');
  const scope=root.querySelector<HTMLSelectElement>('[data-setting="scope"]');
  const x=root.querySelector<HTMLInputElement>('[data-setting="x"]');
  const y=root.querySelector<HTMLInputElement>('[data-setting="y"]');
  const width=root.querySelector<HTMLInputElement>('[data-setting="width"]');
  const height=root.querySelector<HTMLInputElement>('[data-setting="height"]');
  const radius=root.querySelector<HTMLInputElement>('[data-setting="radius"]');
  const settings=root.querySelector<HTMLElement>('.deterministic-settings');
  const grid=scope?.closest<HTMLElement>('.setting-grid');
  if(!frame||!image||!scope||!x||!y||!width||!height||!radius||!settings||!grid)return;

  const scopeLabel=scope.closest<HTMLElement>('label');if(scopeLabel)scopeLabel.hidden=true;
  const radiusLabel=radius.closest<HTMLElement>('label');radiusLabel?.classList.add('blur-strength-control');

  const visual=document.createElement('div');visual.className='blur-visual-controls';
  const heading=document.createElement('div');heading.className='blur-visual-heading';heading.innerHTML='<div><span>Blur area</span><strong>Choose what to blur, then adjust the strength.</strong></div><small>Selected area can be dragged and resized directly on the image.</small>';
  const modes=document.createElement('div');modes.className='blur-scope-toolbar';modes.setAttribute('role','group');modes.setAttribute('aria-label','Blur area');
  const whole=makeScopeButton('whole','Blur whole image','Apply blur across the complete image.');
  const region=makeScopeButton('region','Blur selected area','Draw one movable rectangular blur area.');modes.append(whole,region);visual.append(heading,modes);
  settings.insertBefore(visual,grid);

  const advanced=document.createElement('details');advanced.className='blur-advanced';advanced.hidden=true;
  const summary=document.createElement('summary');summary.textContent='Advanced coordinates';advanced.append(summary);
  const advancedGrid=document.createElement('div');advancedGrid.className='setting-grid blur-advanced-grid';
  for(const control of [x,y,width,height]){const label=control.closest<HTMLElement>('label');if(label)advancedGrid.append(label);}
  advanced.append(advancedGrid);settings.append(advanced);

  const selection=document.createElement('div');selection.className='blur-selection';selection.dataset.role='blur-selection';selection.hidden=true;
  const label=document.createElement('span');label.className='blur-selection-label';label.textContent='Blur area';selection.append(label,makeHandle('nw'),makeHandle('ne'),makeHandle('sw'),makeHandle('se'));frame.append(selection);
  const buttons=[whole,region];

  let dragging:false|{pointerId:number;handle?:Handle;startX:number;startY:number;rect:Rect;imageRect:DOMRect}=false;
  const rect=():Rect=>({x:clamp(numeric(x),0,99),y:clamp(numeric(y),0,99),width:clamp(numeric(width),1,100),height:clamp(numeric(height),1,100)});

  const syncButtons=():void=>buttons.forEach(button=>{
    const active=button.dataset.blurScope===scope.value;
    button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));
  });

  const syncSelection=():void=>{
    syncButtons();advanced.hidden=scope.value!=='region';
    if(scope.value!=='region'||image.hidden||!image.complete||!image.naturalWidth||!image.naturalHeight){selection.hidden=true;return;}
    const imageRect=image.getBoundingClientRect(),frameRect=frame.getBoundingClientRect();
    if(!imageRect.width||!imageRect.height){selection.hidden=true;return;}
    const current=rect(),w=Math.min(current.width,100-current.x),h=Math.min(current.height,100-current.y);
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
    const value=button.dataset.blurScope;if(value!=='whole'&&value!=='region')return;
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
    const {imageRect,rect:base,handle}=dragging,dx=(event.clientX-dragging.startX)/Math.max(1,imageRect.width)*100,dy=(event.clientY-dragging.startY)/Math.max(1,imageRect.height)*100;
    if(!handle){applyRect({...base,x:base.x+dx,y:base.y+dy});return;}
    let left=base.x,right=base.x+base.width,top=base.y,bottom=base.y+base.height;
    if(handle.includes('w'))left=clamp(base.x+dx,0,right-2);else right=clamp(right+dx,left+2,100);
    if(handle.includes('n'))top=clamp(base.y+dy,0,bottom-2);else bottom=clamp(bottom+dy,top+2,100);
    applyRect({x:left,y:top,width:right-left,height:bottom-top});
  });

  const end=(event:PointerEvent):void=>{if(dragging&&event.pointerId===dragging.pointerId){dragging=false;try{selection.releasePointerCapture(event.pointerId);}catch{}}};
  selection.addEventListener('pointerup',end);selection.addEventListener('pointercancel',end);
  [scope,x,y,width,height].forEach(control=>{control.addEventListener('input',()=>requestAnimationFrame(syncSelection));control.addEventListener('change',()=>requestAnimationFrame(syncSelection));});
  image.addEventListener('load',()=>requestAnimationFrame(syncSelection));root.addEventListener('click',()=>requestAnimationFrame(syncSelection));
  window.addEventListener('resize',syncSelection,{passive:true});window.addEventListener('pagehide',()=>window.removeEventListener('resize',syncSelection),{once:true});
  root.dataset.blurEditorReady='true';requestAnimationFrame(syncSelection);
}
