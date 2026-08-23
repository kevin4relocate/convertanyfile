type CropAspect = 'free' | 'original' | '1:1' | '4:3' | '3:2' | '16:9' | '9:16';
type CropShape = 'rect' | 'circle';
type Handle = 'nw' | 'ne' | 'sw' | 'se';

type CropControls = {
  aspect: HTMLSelectElement;
  shape: HTMLInputElement;
  x: HTMLInputElement;
  y: HTMLInputElement;
  width: HTMLInputElement;
  height: HTMLInputElement;
};

type CropRect = { x:number; y:number; width:number; height:number };

const clamp = (value:number,min:number,max:number):number => Math.min(max,Math.max(min,value));
const number = (control:HTMLInputElement):number => Number(control.value || '0');
const ratioFor = (aspect:CropAspect,sourceWidth:number,sourceHeight:number):number|null => {
  if(aspect==='free')return null;
  if(aspect==='original')return sourceWidth/Math.max(1,sourceHeight);
  if(aspect==='1:1')return 1;
  if(aspect==='4:3')return 4/3;
  if(aspect==='3:2')return 3/2;
  if(aspect==='16:9')return 16/9;
  return 9/16;
};

function effectiveRect(controls:CropControls,sourceWidth:number,sourceHeight:number):CropRect {
  let width=clamp(number(controls.width),1,100)/100*sourceWidth;
  let height=clamp(number(controls.height),1,100)/100*sourceHeight;
  let x=clamp(number(controls.x),0,100)/100*sourceWidth;
  let y=clamp(number(controls.y),0,100)/100*sourceHeight;
  const target=ratioFor(controls.aspect.value as CropAspect,sourceWidth,sourceHeight);
  if(target){
    const current=width/Math.max(1,height);
    if(current>target){const next=height*target;x+=(width-next)/2;width=next;}
    else{const next=width/target;y+=(height-next)/2;height=next;}
  }
  width=Math.min(width,sourceWidth);height=Math.min(height,sourceHeight);
  x=clamp(x,0,Math.max(0,sourceWidth-width));y=clamp(y,0,Math.max(0,sourceHeight-height));
  return{x:x/sourceWidth*100,y:y/sourceHeight*100,width:width/sourceWidth*100,height:height/sourceHeight*100};
}

function setNumber(control:HTMLInputElement,value:number):void {
  control.value=String(Math.round(clamp(value,0,100)*100)/100);
}

function emit(control:HTMLInputElement|HTMLSelectElement,eventName:'input'|'change'):void {
  control.dispatchEvent(new Event(eventName,{bubbles:true}));
}

export function mountCropInteractiveEditor(root:HTMLElement):void {
  if(root.dataset.toolId!=='crop-image'||root.dataset.cropEditorReady==='true')return;
  const frame=root.querySelector<HTMLElement>('[data-role="crop-editor-frame"]');
  const image=root.querySelector<HTMLImageElement>('[data-role="source-preview"]');
  const selection=root.querySelector<HTMLElement>('[data-role="crop-selection"]');
  const aspect=root.querySelector<HTMLSelectElement>('[data-setting="aspect"]');
  const shape=root.querySelector<HTMLInputElement>('[data-setting="shape"]');
  const x=root.querySelector<HTMLInputElement>('[data-setting="x"]');
  const y=root.querySelector<HTMLInputElement>('[data-setting="y"]');
  const width=root.querySelector<HTMLInputElement>('[data-setting="width"]');
  const height=root.querySelector<HTMLInputElement>('[data-setting="height"]');
  if(!frame||!image||!selection||!aspect||!shape||!x||!y||!width||!height)return;
  const controls:CropControls={aspect,shape,x,y,width,height};
  const output=root.querySelector<HTMLSelectElement>('[data-role="output-format"]');
  const presetButtons=[...root.querySelectorAll<HTMLButtonElement>('[data-crop-preset]')];
  let dragging:false|{pointerId:number;handle?:Handle;startX:number;startY:number;rect:CropRect;imageRect:DOMRect}=false;

  const syncOutput=():void=>{
    if(!output)return;
    const circular=shape.value==='circle';
    if(circular){
      if(output.value!=='png'){output.value='png';emit(output,'change');}
      output.disabled=true;output.dataset.cropCircleLock='true';output.title='Circle crop uses PNG so the area outside the circle can stay transparent.';
    }else if(output.dataset.cropCircleLock==='true'){
      output.disabled=false;delete output.dataset.cropCircleLock;output.removeAttribute('title');
    }
  };

  const syncPresetButtons=():void=>{
    const currentShape=shape.value as CropShape,currentAspect=aspect.value as CropAspect;
    for(const button of presetButtons){
      const preset=button.dataset.cropPreset;
      const active=preset==='circle'?currentShape==='circle':currentShape!=='circle'&&(
        (preset==='rectangle'&&currentAspect==='free')||(preset==='square'&&currentAspect==='1:1')||preset===currentAspect
      );
      button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));
    }
  };

  const syncSelection=():void=>{
    if(image.hidden||!image.complete||!image.naturalWidth||!image.naturalHeight){selection.hidden=true;return;}
    const imageRect=image.getBoundingClientRect(),frameRect=frame.getBoundingClientRect();
    if(!imageRect.width||!imageRect.height){selection.hidden=true;return;}
    const rect=effectiveRect(controls,image.naturalWidth,image.naturalHeight);
    selection.hidden=false;
    selection.classList.toggle('is-circle',shape.value==='circle');
    selection.style.left=`${imageRect.left-frameRect.left+rect.x/100*imageRect.width}px`;
    selection.style.top=`${imageRect.top-frameRect.top+rect.y/100*imageRect.height}px`;
    selection.style.width=`${rect.width/100*imageRect.width}px`;
    selection.style.height=`${rect.height/100*imageRect.height}px`;
    syncPresetButtons();syncOutput();
  };

  const applyRect=(rect:CropRect):void=>{
    setNumber(x,rect.x);setNumber(y,rect.y);setNumber(width,rect.width);setNumber(height,rect.height);
    emit(x,'input');emit(y,'input');emit(width,'input');emit(height,'input');
    requestAnimationFrame(syncSelection);
  };

  const applyPreset=(preset:string):void=>{
    shape.value=preset==='circle'?'circle':'rect';
    const nextAspect:CropAspect=preset==='rectangle'?'free':preset==='square'||preset==='circle'?'1:1':preset as CropAspect;
    aspect.value=nextAspect;
    setNumber(x,8);setNumber(y,8);setNumber(width,84);setNumber(height,84);
    emit(shape,'change');emit(aspect,'change');emit(x,'input');emit(y,'input');emit(width,'input');emit(height,'input');
    requestAnimationFrame(syncSelection);
  };

  presetButtons.forEach(button=>button.addEventListener('click',()=>applyPreset(button.dataset.cropPreset||'rectangle')));

  selection.addEventListener('pointerdown',(event)=>{
    if(event.button!==0||image.hidden)return;
    const target=(event.target as HTMLElement).closest<HTMLElement>('[data-crop-handle]');
    const rect=effectiveRect(controls,image.naturalWidth,image.naturalHeight);
    dragging={pointerId:event.pointerId,handle:target?.dataset.cropHandle as Handle|undefined,startX:event.clientX,startY:event.clientY,rect,imageRect:image.getBoundingClientRect()};
    selection.setPointerCapture(event.pointerId);event.preventDefault();
  });

  selection.addEventListener('pointermove',(event)=>{
    if(!dragging||event.pointerId!==dragging.pointerId)return;
    const {imageRect,rect,handle}=dragging;
    const dx=(event.clientX-dragging.startX)/Math.max(1,imageRect.width)*100;
    const dy=(event.clientY-dragging.startY)/Math.max(1,imageRect.height)*100;
    if(!handle){
      applyRect({...rect,x:clamp(rect.x+dx,0,100-rect.width),y:clamp(rect.y+dy,0,100-rect.height)});return;
    }
    const left=rect.x,right=rect.x+rect.width,top=rect.y,bottom=rect.y+rect.height;
    const anchorX=handle.includes('w')?right:left,anchorY=handle.includes('n')?bottom:top;
    let pointX=clamp((handle.includes('w')?left:right)+dx,0,100),pointY=clamp((handle.includes('n')?top:bottom)+dy,0,100);
    const dirX=handle.includes('w')?-1:1,dirY=handle.includes('n')?-1:1;
    let nextWidth=Math.max(2,Math.abs(pointX-anchorX)),nextHeight=Math.max(2,Math.abs(pointY-anchorY));
    const targetRatio=ratioFor(aspect.value as CropAspect,image.naturalWidth,image.naturalHeight);
    if(targetRatio){
      const displayedRatio=imageRect.width/Math.max(1,imageRect.height);
      const targetDisplayRatio=targetRatio/displayedRatio;
      if(nextWidth/nextHeight>targetDisplayRatio)nextWidth=nextHeight*targetDisplayRatio;else nextHeight=nextWidth/targetDisplayRatio;
      nextWidth=Math.min(nextWidth,dirX<0?anchorX:100-anchorX);nextHeight=Math.min(nextHeight,dirY<0?anchorY:100-anchorY);
      if(nextWidth/nextHeight>targetDisplayRatio)nextWidth=nextHeight*targetDisplayRatio;else nextHeight=nextWidth/targetDisplayRatio;
    }
    const nextX=dirX<0?anchorX-nextWidth:anchorX,nextY=dirY<0?anchorY-nextHeight:anchorY;
    applyRect({x:clamp(nextX,0,100-nextWidth),y:clamp(nextY,0,100-nextHeight),width:nextWidth,height:nextHeight});
  });

  const endDrag=(event:PointerEvent):void=>{if(dragging&&event.pointerId===dragging.pointerId){dragging=false;try{selection.releasePointerCapture(event.pointerId);}catch{}}};
  selection.addEventListener('pointerup',endDrag);selection.addEventListener('pointercancel',endDrag);

  [aspect,shape,x,y,width,height].forEach(control=>{
    control.addEventListener('input',()=>requestAnimationFrame(syncSelection));
    control.addEventListener('change',()=>requestAnimationFrame(syncSelection));
  });
  image.addEventListener('load',()=>requestAnimationFrame(syncSelection));
  root.addEventListener('click',()=>requestAnimationFrame(syncSelection));
  window.addEventListener('resize',syncSelection,{passive:true});
  window.addEventListener('pagehide',()=>window.removeEventListener('resize',syncSelection),{once:true});
  root.dataset.cropEditorReady='true';
  requestAnimationFrame(syncSelection);
}
