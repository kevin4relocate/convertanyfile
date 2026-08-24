type VisualToolId = 'crop-image' | 'blur-image';
type Handle = 'nw' | 'ne' | 'se' | 'sw';
type Rect = { x:number; y:number; width:number; height:number };

const clamp=(value:number,min:number,max:number):number=>Math.min(max,Math.max(min,value));
const numberValue=(input:HTMLInputElement,fallback:number):number=>Number.isFinite(Number(input.value))?Number(input.value):fallback;

export function mountVisualRegionController(root:HTMLElement):void {
  const rawId=root.dataset.toolId;
  if(rawId!=='crop-image'&&rawId!=='blur-image')return;
  if(root.dataset.visualRegionReady==='true')return;
  root.dataset.visualRegionReady='true';
  const toolId=rawId as VisualToolId;

  const source=root.querySelector<HTMLImageElement>('[data-role="source-preview"]');
  const frame=source?.parentElement;
  const x=root.querySelector<HTMLInputElement>('[data-setting="x"]');
  const y=root.querySelector<HTMLInputElement>('[data-setting="y"]');
  const width=root.querySelector<HTMLInputElement>('[data-setting="width"]');
  const height=root.querySelector<HTMLInputElement>('[data-setting="height"]');
  const shape=root.querySelector<HTMLInputElement>('[data-setting="shape"]');
  const aspect=root.querySelector<HTMLSelectElement>('[data-setting="aspect"]');
  const scope=root.querySelector<HTMLSelectElement>('[data-setting="scope"]');
  const outputFormat=root.querySelector<HTMLSelectElement>('[data-role="output-format"]');
  if(!source||!frame||!x||!y||!width||!height||!shape)return;

  const overlay=document.createElement('div');
  overlay.className='visual-region-overlay';
  overlay.dataset.shape=shape.value||'rect';
  overlay.innerHTML='<span class="visual-region-overlay__fill"></span><span class="visual-region-handle visual-region-handle--nw" data-handle="nw"></span><span class="visual-region-handle visual-region-handle--ne" data-handle="ne"></span><span class="visual-region-handle visual-region-handle--se" data-handle="se"></span><span class="visual-region-handle visual-region-handle--sw" data-handle="sw"></span><span class="visual-region-overlay__hint">Drag to move · use corners to resize</span>';
  frame.append(overlay);

  const shapeButtons=[...root.querySelectorAll<HTMLButtonElement>('[data-selection-shape]')];
  const scopeButtons=[...root.querySelectorAll<HTMLButtonElement>('[data-blur-scope]')];
  const aspectButtons=[...root.querySelectorAll<HTMLButtonElement>('[data-aspect-preset]')];
  const regionOnly=[...root.querySelectorAll<HTMLElement>('[data-region-controls]')];

  const readRect=():Rect=>{
    const w=clamp(numberValue(width,50),1,100),h=clamp(numberValue(height,50),1,100);
    return {x:clamp(numberValue(x,0),0,100-w),y:clamp(numberValue(y,0),0,100-h),width:w,height:h};
  };
  const writeRect=(rect:Rect,notify=true):void=>{
    const safe={width:clamp(rect.width,1,100),height:clamp(rect.height,1,100),x:0,y:0};
    safe.x=clamp(rect.x,0,100-safe.width);safe.y=clamp(rect.y,0,100-safe.height);
    x.value=safe.x.toFixed(2);y.value=safe.y.toFixed(2);width.value=safe.width.toFixed(2);height.value=safe.height.toFixed(2);
    if(notify)x.dispatchEvent(new Event('input',{bubbles:true}));
  };
  const targetAspect=():number|undefined=>{
    const selectedShape=shape.value;
    if(selectedShape==='square'||selectedShape==='circle')return 1;
    if(toolId!=='crop-image'||!aspect)return undefined;
    const value=aspect.value;
    if(value==='free')return undefined;
    if(value==='original')return source.naturalWidth/Math.max(1,source.naturalHeight);
    const parts=value.split(':').map(Number);if(parts.length!==2||!parts[0]||!parts[1])return undefined;
    return parts[0]/parts[1];
  };
  const enforceAspect=(rect:Rect,anchor:'center'|'nw'|'ne'|'se'|'sw'='center'):Rect=>{
    const ratio=targetAspect();if(!ratio||!source.naturalWidth||!source.naturalHeight)return rect;
    let w=clamp(rect.width,2,100);
    let h=w*source.naturalWidth/(ratio*Math.max(1,source.naturalHeight));
    if(h>100){h=100;w=h*ratio*source.naturalHeight/Math.max(1,source.naturalWidth);}
    let nx=rect.x,ny=rect.y;
    if(anchor==='center'){const cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;nx=cx-w/2;ny=cy-h/2;}
    if(anchor==='nw'){nx=rect.x+rect.width-w;ny=rect.y+rect.height-h;}
    if(anchor==='ne'){ny=rect.y+rect.height-h;}
    if(anchor==='sw'){nx=rect.x+rect.width-w;}
    return{x:clamp(nx,0,100-w),y:clamp(ny,0,100-h),width:w,height:h};
  };
  const syncAlphaOutput=():void=>{
    if(toolId!=='crop-image'||!outputFormat)return;
    const needsAlpha=shape.value==='circle'||shape.value==='triangle';
    for(const option of [...outputFormat.options]){
      if(option.value==='source'||option.value==='jpg')option.disabled=needsAlpha;
    }
    if(needsAlpha&&(outputFormat.value==='source'||outputFormat.value==='jpg')){
      outputFormat.value='png';outputFormat.dispatchEvent(new Event('change',{bubbles:true}));
    }
  };
  const syncControls=():void=>{
    const selectedShape=shape.value||'rect';overlay.dataset.shape=selectedShape;
    shapeButtons.forEach(button=>{const active=button.dataset.selectionShape===selectedShape;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
    if(scope){scopeButtons.forEach(button=>{const active=button.dataset.blurScope===scope.value;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});}
    if(aspect){aspectButtons.forEach(button=>{const active=button.dataset.aspectPreset===aspect.value;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});}
    const regionActive=toolId==='crop-image'||scope?.value==='region';regionOnly.forEach(element=>element.hidden=!regionActive);
    overlay.hidden=!regionActive||source.hidden||!source.src;
    root.dataset.visualRegionActive=String(regionActive);
    syncAlphaOutput();
  };
  const render=():void=>{
    syncControls();if(overlay.hidden)return;
    const frameRect=frame.getBoundingClientRect(),imageRect=source.getBoundingClientRect();if(!imageRect.width||!imageRect.height)return;
    const rect=readRect();
    overlay.style.left=`${imageRect.left-frameRect.left+imageRect.width*rect.x/100}px`;
    overlay.style.top=`${imageRect.top-frameRect.top+imageRect.height*rect.y/100}px`;
    overlay.style.width=`${imageRect.width*rect.width/100}px`;
    overlay.style.height=`${imageRect.height*rect.height/100}px`;
  };

  shapeButtons.forEach(button=>button.addEventListener('click',()=>{
    const value=button.dataset.selectionShape;if(!value)return;shape.value=value;shape.dispatchEvent(new Event('change',{bubbles:true}));
    if(value==='square'||value==='circle')writeRect(enforceAspect(readRect()),true);syncControls();render();
  }));
  scopeButtons.forEach(button=>button.addEventListener('click',()=>{
    if(!scope)return;const value=button.dataset.blurScope;if(value!=='whole'&&value!=='region')return;scope.value=value;scope.dispatchEvent(new Event('change',{bubbles:true}));syncControls();render();
  }));
  aspectButtons.forEach(button=>button.addEventListener('click',()=>{
    if(!aspect)return;const value=button.dataset.aspectPreset;if(!value)return;aspect.value=value;aspect.dispatchEvent(new Event('change',{bubbles:true}));writeRect(enforceAspect(readRect()),true);render();
  }));
  aspect?.addEventListener('change',()=>{writeRect(enforceAspect(readRect()),true);render();});
  for(const input of [x,y,width,height])input.addEventListener('input',()=>{
    const rect=readRect();writeRect(rect,false);render();
  });
  outputFormat?.addEventListener('change',syncAlphaOutput);
  source.addEventListener('load',()=>{if(toolId==='crop-image')writeRect(enforceAspect(readRect()),false);requestAnimationFrame(render);});
  window.addEventListener('resize',render,{passive:true});
  const resizeObserver=new ResizeObserver(render);resizeObserver.observe(frame);resizeObserver.observe(source);
  const mutationObserver=new MutationObserver(()=>requestAnimationFrame(render));
  mutationObserver.observe(source,{attributes:true,attributeFilter:['src','hidden']});
  root.addEventListener('click',event=>{const target=event.target;if(!(target instanceof Element))return;if(target.closest('.deterministic-file-card,[data-edit-scope]'))setTimeout(render,0);});

  let drag:undefined|{kind:'move'|'resize';handle?:Handle;startX:number;startY:number;rect:Rect;imageWidth:number;imageHeight:number};
  overlay.addEventListener('pointerdown',event=>{
    if(overlay.hidden)return;event.preventDefault();const handle=(event.target as HTMLElement).dataset.handle as Handle|undefined;
    const imageRect=source.getBoundingClientRect();drag={kind:handle?'resize':'move',handle,startX:event.clientX,startY:event.clientY,rect:readRect(),imageWidth:Math.max(1,imageRect.width),imageHeight:Math.max(1,imageRect.height)};overlay.setPointerCapture(event.pointerId);overlay.classList.add('is-dragging');
  });
  overlay.addEventListener('pointermove',event=>{
    if(!drag||!overlay.hasPointerCapture(event.pointerId))return;const dx=(event.clientX-drag.startX)/drag.imageWidth*100,dy=(event.clientY-drag.startY)/drag.imageHeight*100;let next={...drag.rect};
    if(drag.kind==='move'){next.x=drag.rect.x+dx;next.y=drag.rect.y+dy;}
    else if(drag.handle==='se'){next.width=drag.rect.width+dx;next.height=drag.rect.height+dy;}
    else if(drag.handle==='sw'){next.x=drag.rect.x+dx;next.width=drag.rect.width-dx;next.height=drag.rect.height+dy;}
    else if(drag.handle==='ne'){next.y=drag.rect.y+dy;next.width=drag.rect.width+dx;next.height=drag.rect.height-dy;}
    else if(drag.handle==='nw'){next.x=drag.rect.x+dx;next.y=drag.rect.y+dy;next.width=drag.rect.width-dx;next.height=drag.rect.height-dy;}
    next.width=Math.max(3,next.width);next.height=Math.max(3,next.height);
    if(drag.kind==='resize')next=enforceAspect(next,drag.handle);writeRect(next,true);render();
  });
  const stop=(event:PointerEvent):void=>{if(!drag)return;if(overlay.hasPointerCapture(event.pointerId))overlay.releasePointerCapture(event.pointerId);drag=undefined;overlay.classList.remove('is-dragging');};
  overlay.addEventListener('pointerup',stop);overlay.addEventListener('pointercancel',stop);

  syncControls();render();
}
