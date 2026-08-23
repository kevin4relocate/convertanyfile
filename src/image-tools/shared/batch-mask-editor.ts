import type { PixelRect } from '../../platform/image-tools/types';
import { createZipBlob, downloadBlob } from '../core/download';
import { RemoveWatermarkWorkerClient } from '../remove-watermark/worker-client';
import {
  clamp, rectCopy, opsCopy, histCopy, sameOps, normalize, squareLike, squareRect, makeOp, workerOps,
  starPath, diamondPath, drawText, operationCornersPx, operationCenterPx, rotationHandlePx, localPointPx,
  hit, moveRotatedRect, resizeRect, normalizeRotation, type Mode, type Op, type P, type Handle,
} from './mask-geometry';

type EditMode = 'shared' | 'individual';
type Preference = 'auto' | 'manual';
type CanvasCommand =
  | { type:'undo' }
  | { type:'redo' }
  | { type:'delete' }
  | { type:'duplicate' }
  | { type:'nudge'; dx:number; dy:number };
type Item = {
  id:string; file:File; width:number; height:number; ratio:number; ratioLabel:string; url:string;
  ops?:Op[]; history?:Op[][]; redo?:Op[][]; origin?:'shared'|'custom'; status:'ready'|'processing'|'done'|'error';
  result?:Blob; ext?:string; error?:string;
};
type Interaction =
  | { kind:'draw'; start:P; now:P }
  | { kind:'move'; index:number; start:P; rect:PixelRect; before:Op[] }
  | { kind:'resize'; index:number; handle:Handle; rect:PixelRect; before:Op[] }
  | { kind:'rotate'; index:number; startAngle:number; startRotation:number; before:Op[] };

const RATIO_TOL = .015;
const HISTORY_MAX = 50;
const q = <T extends Element>(root:ParentNode, selector:string):T => { const element=root.querySelector<T>(selector); if(!element)throw new Error(`Image editor is missing ${selector}`); return element; };
const maybe = <T extends Element>(root:ParentNode, selector:string):T|undefined => root.querySelector<T>(selector) ?? undefined;
const ext = (name:string) => name.includes('.') ? name.slice(name.lastIndexOf('.')+1).toLowerCase() : '';
const base = (name:string) => name.replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|]+/g,'-').trim() || 'image';
const mime = (file:File) => file.type==='image/jpeg'||file.type==='image/png'||file.type==='image/webp' ? file.type : ext(file.name)==='webp' ? 'image/webp' : ['jpg','jpeg'].includes(ext(file.name)) ? 'image/jpeg' : 'image/png';
const sourceExt = (file:File) => mime(file)==='image/jpeg' ? 'jpg' : mime(file)==='image/webp' ? 'webp' : 'png';
const ratioMatch = (a:number,b:number) => Math.abs(a-b)/Math.max(.00001,b) <= RATIO_TOL;

function ratioLabel(width:number,height:number):string {
  const ratio=width/Math.max(1,height); let bestN=Math.max(1,Math.round(ratio)),bestD=1,bestError=Math.abs(bestN-ratio);
  for(let d=1;d<=20;d++){const n=Math.max(1,Math.round(ratio*d)),error=Math.abs(n/d-ratio);if(error<bestError){bestN=n;bestD=d;bestError=error}}
  return bestError/Math.max(.00001,ratio)<=.003 ? `${bestN}:${bestD}` : `${ratio.toFixed(3)}:1`;
}
function flattenJpeg(pixels:Uint8ClampedArray):void { for(let i=0;i<pixels.length;i+=4){const alpha=(pixels[i+3]??255)/255;if(alpha>=1)continue;pixels[i]=Math.round((pixels[i]??0)*alpha+255*(1-alpha));pixels[i+1]=Math.round((pixels[i+1]??0)*alpha+255*(1-alpha));pixels[i+2]=Math.round((pixels[i+2]??0)*alpha+255*(1-alpha));pixels[i+3]=255;} }
const toBlob = (canvas:HTMLCanvasElement,type:string,quality:number) => new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Unable to encode repaired image')),type,quality));

export function mountBatchMaskEditor(root:HTMLElement):void {
  const notice=q<HTMLElement>(root,'[data-role="notice"]'), upload=q<HTMLElement>(root,'[data-role="upload-view"]'), drop=q<HTMLButtonElement>(root,'[data-role="drop-zone"]'), input=q<HTMLInputElement>(root,'[data-role="file-input"]'), editor=q<HTMLElement>(root,'[data-role="editor"]');
  const ratio=q<HTMLElement>(root,'[data-role="ratio-status"]'), warn=q<HTMLElement>(root,'[data-role="batch-warning"]'), warnIcon=q<HTMLElement>(root,'[data-role="batch-warning-icon"]'), warnTitle=q<HTMLElement>(root,'[data-role="batch-warning-title"]'), warnCopy=q<HTMLElement>(root,'[data-role="batch-warning-copy"]');
  const list=q<HTMLElement>(root,'[data-role="batch-list"]'), count=q<HTMLElement>(root,'[data-role="batch-count"]'), add=q<HTMLButtonElement>(root,'[data-role="add-more"]'), clear=q<HTMLButtonElement>(root,'[data-role="clear-all"]');
  const modeButtons=[...root.querySelectorAll<HTMLButtonElement>('[data-tool-mode]')], editButtons=[...root.querySelectorAll<HTMLButtonElement>('[data-edit-mode]')], editCopy=q<HTMLElement>(root,'[data-role="edit-mode-copy"]'), useShared=q<HTMLButtonElement>(root,'[data-role="reset-to-shared"]');
  const undo=q<HTMLButtonElement>(root,'[data-role="undo"]'), redo=maybe<HTMLButtonElement>(root,'[data-role="redo"]'), clearMask=q<HTMLButtonElement>(root,'[data-role="reset-mask"]'), selStatus=q<HTMLElement>(root,'[data-role="selection-status"]'), scope=q<HTMLElement>(root,'[data-role="source-scope"]'), sourceName=q<HTMLElement>(root,'[data-role="source-name"]'), sourceMeta=q<HTMLElement>(root,'[data-role="source-meta"]');
  const orig=q<HTMLCanvasElement>(root,'[data-role="original-canvas"]'), mask=q<HTMLCanvasElement>(root,'[data-role="mask-canvas"]'), result=q<HTMLCanvasElement>(root,'[data-role="result-canvas"]'), empty=q<HTMLElement>(root,'[data-role="result-empty"]'), resultLabel=q<HTMLElement>(root,'[data-role="result-label"]');
  const outButtons=[...root.querySelectorAll<HTMLButtonElement>('[data-output-value]')], quality=q<HTMLInputElement>(root,'[data-role="quality"]'), qualityOut=q<HTMLOutputElement>(root,'[data-role="quality-value"]');
  const progress=q<HTMLElement>(root,'[data-role="batch-progress"]'), progressLabel=q<HTMLElement>(root,'[data-role="progress-label"]'), progressCount=q<HTMLElement>(root,'[data-role="progress-count"]'), bar=q<HTMLElement>(root,'[data-role="progress-bar"]'), cancel=q<HTMLButtonElement>(root,'[data-role="cancel"]');
  const summary=q<HTMLElement>(root,'[data-role="batch-result-summary"]'), prepared=q<HTMLElement>(root,'[data-role="prepared-summary"]'), remove=q<HTMLButtonElement>(root,'[data-role="remove"]'), download=q<HTMLButtonElement>(root,'[data-role="download"]');
  const textBox=maybe<HTMLElement>(root,'[data-role="text-mask-control"]'), textInput=maybe<HTMLInputElement>(root,'[data-role="text-mask-input"]');

  const worker=new RemoveWatermarkWorkerClient();
  const target=root.dataset.targetLabel||'watermark', suffix=root.dataset.downloadSuffix||'watermark-removed';
  const maxFile=Number(root.dataset.maxFileBytes||10*1024*1024), maxPixels=Number(root.dataset.maxPixels||20_000_000), maxDim=Number(root.dataset.maxDimension||12000), maxFiles=Number(root.dataset.maxFiles||50), maxTotal=Number(root.dataset.maxTotalBytes||200*1024*1024);
  const supported=new Set<Mode>(modeButtons.map(button=>button.dataset.toolMode as Mode)), requested=root.dataset.defaultMode as Mode|undefined;
  const initial=requested&&supported.has(requested)?requested:(supported.has('star4')?'star4':[...supported][0]||'rect');

  const state:{items:Item[];active?:string;bitmap?:ImageBitmap;w:number;h:number;mode:Mode;edit:EditMode;pref:Preference;shared:Op[];sharedHist:Op[][];sharedRedo:Op[][];ops:Op[];history:Op[][];redo:Op[][];selected?:number;interaction?:Interaction;output:'source'|'png'|'jpeg'|'webp';processing:boolean;cancel:boolean;generation:number}={items:[],w:0,h:0,mode:initial,edit:'shared',pref:'auto',shared:[],sharedHist:[],sharedRedo:[],ops:[],history:[],redo:[],output:'source',processing:false,cancel:false,generation:0};

  const active=()=>state.items.find(item=>item.id===state.active);
  const mixed=()=>state.items.length>1&&state.items.slice(1).some(item=>!ratioMatch(item.ratio,state.items[0]!.ratio));
  const effective=(item:Item)=>state.edit==='shared'?state.shared:(item.ops??[]);
  const preparedItems=()=>state.edit==='shared'?(state.shared.length?[...state.items]:[]):state.items.filter(item=>item.ops?.length);
  const scopeText=()=>state.edit==='shared'?`Changes apply to all ${state.items.length} ${state.items.length===1?'image':'images'}.`:'Changes apply only to this image.';
  const hideNotice=()=>{notice.hidden=true;notice.textContent='';delete notice.dataset.type;};
  const showNotice=(message:string,type:'info'|'error'='info')=>{notice.hidden=false;notice.textContent=message;notice.dataset.type=type;};
  const cap=(stack:Op[][])=>{if(stack.length>HISTORY_MAX)stack.shift();};
  const pushHistory=(before:Op[])=>{state.history.push(opsCopy(before));cap(state.history);state.redo=[];};

  function persist(origin?:'shared'|'custom'):void {
    if(state.edit==='shared'){
      state.shared=opsCopy(state.ops);state.sharedHist=histCopy(state.history);state.sharedRedo=histCopy(state.redo);
      for(const item of state.items)if(item.origin==='shared'){item.ops=opsCopy(state.shared);if(!state.shared.length)item.origin=undefined;}
    }else{
      const item=active();if(!item)return;item.ops=opsCopy(state.ops);item.history=histCopy(state.history);item.redo=histCopy(state.redo);
      item.origin=origin??(state.shared.length&&sameOps(item.ops,state.shared)?'shared':item.ops.length?'custom':undefined);
    }
  }
  function ensure(item:Item):void { if(item.ops!==undefined)return;item.ops=state.shared.length?opsCopy(state.shared):[];item.history=[];item.redo=[];item.origin=state.shared.length?'shared':undefined; }
  function activate():void {
    if(state.edit==='shared'){state.ops=opsCopy(state.shared);state.history=histCopy(state.sharedHist);state.redo=histCopy(state.sharedRedo);}
    else{const item=active();if(item){ensure(item);state.ops=opsCopy(item.ops??[]);state.history=histCopy(item.history??[]);state.redo=histCopy(item.redo??[]);}else{state.ops=[];state.history=[];state.redo=[];}}
    state.selected=state.ops.length?state.ops.length-1:undefined;state.interaction=undefined;syncText();
  }
  function syncText():void { if(!textInput)return;const operation=state.selected===undefined?undefined:state.ops[state.selected];textInput.value=operation?.type==='text'?operation.text:''; }

  function updateWarning():void {
    if(state.items.length<=1){warn.hidden=true;return;} warn.hidden=false;
    if(mixed()&&state.edit==='shared'){warn.dataset.tone='warning';warnIcon.textContent='!';warnTitle.textContent='Mixed aspect ratios + shared mask';warnCopy.textContent='One normalized mask may not align across different layouts. Edit individually is safer.';}
    else if(mixed()){warn.dataset.tone='info';warnIcon.textContent='i';warnTitle.textContent='Mixed aspect ratios detected';warnCopy.textContent=state.pref==='auto'?'Edit individually was selected automatically so each image can keep its own mask.':'Individual editing keeps each image independent.';}
    else{warn.dataset.tone='compatible';warnIcon.textContent='✓';warnTitle.textContent='Matching aspect ratio detected';warnCopy.textContent=state.edit==='shared'?`One mask for all is selected. Keep it when the visible ${target} stays in the same relative position and approximate size.`:'These images can share a mask, but individual editing is selected.';}
  }
  function updateModeUi():void {
    root.dataset.editMode=state.edit;root.dataset.editModePreference=state.pref;
    editButtons.forEach(button=>{const selected=button.dataset.editMode===state.edit;button.classList.toggle('is-active',selected);button.setAttribute('aria-checked',String(selected));});
    const preparedCount=preparedItems().length;
    if(state.edit==='shared'){
      editCopy.textContent=state.pref==='auto'?'Selected automatically because the images share an aspect ratio. You can switch at any time.':`One mask is shared by every image. Best when the ${target} stays in the same relative position.`;
      scope.textContent='Shared sample';prepared.textContent=state.shared.length?`Shared mask prepares all ${state.items.length} images.`:'Draw one shared mask to prepare the batch.';remove.textContent=`Remove ${target} from batch`;
    }else{
      editCopy.textContent=state.pref==='auto'&&mixed()?'Selected automatically because mixed aspect ratios were detected. Each image keeps its own mask.':'Each image keeps its own mask. Select an image to edit it.';
      scope.textContent='Individual image';prepared.textContent=`${preparedCount}/${state.items.length} ${preparedCount===1?'image has':'images have'} a mask.`;remove.textContent=preparedCount?`Remove ${preparedCount} prepared ${preparedCount===1?'image':'images'}`:'Prepare an image mask';
    }
    useShared.hidden=state.edit!=='individual'||!state.shared.length||!active();
    ratio.textContent=!state.items.length?'Upload images and the editor will recommend a safe starting mode.':mixed()?`Mixed aspect ratios · ${state.edit==='individual'?'individual editing recommended':'shared mask selected manually'}.`:`Same ratio ${state.items[0]!.ratioLabel} · ${state.edit==='shared'?'one mask for all is a good fit':'individual editing selected'}.`;
    updateWarning();
  }
  function setMode(mode:Mode):void {
    if(!supported.has(mode))return;state.mode=mode;modeButtons.forEach(button=>{const selected=button.dataset.toolMode===mode;button.classList.toggle('is-active',selected);button.setAttribute('aria-pressed',String(selected));});
    mask.dataset.mode=mode;if(textBox)textBox.hidden=mode!=='text';
    selStatus.textContent=mode==='text'?`Type ${target} text, then drag to move, use a corner to resize, or use the round handle to rotate. ${scopeText()}`:`Draw a mask, then drag to move, use a corner to resize, or use the round handle to rotate. ${scopeText()}`;syncText();
  }

  function clearResult():void {empty.hidden=false;resultLabel.textContent='Run repair to preview';result.getContext('2d')?.clearRect(0,0,result.width,result.height);}
  async function renderResult(item:Item):Promise<void>{if(!item.result||item.status!=='done'){clearResult();return;}const bitmap=await createImageBitmap(item.result);try{const context=result.getContext('2d');if(context){context.clearRect(0,0,result.width,result.height);context.drawImage(bitmap,0,0,result.width,result.height);empty.hidden=true;resultLabel.textContent='Processed result';}}finally{bitmap.close();}}
  function invalidate(message='Settings changed — run repair again'):void {let changed=false;for(const item of state.items){if(item.result||item.status==='done'||item.status==='error')changed=true;item.result=undefined;item.ext=undefined;item.error=undefined;item.status='ready';}clearResult();if(changed)summary.textContent=message;download.disabled=true;renderQueue();}

  function canvasRect(operation:Op):PixelRect {return{x:operation.rect.x*mask.width,y:operation.rect.y*mask.height,width:operation.rect.width*mask.width,height:operation.rect.height*mask.height};}
  function drawOp(context:CanvasRenderingContext2D,operation:Op,stroke=false):void {
    const rect=canvasRect(operation),cx=rect.x+rect.width/2,cy=rect.y+rect.height/2,local={x:-rect.width/2,y:-rect.height/2,width:rect.width,height:rect.height};
    context.save();context.translate(cx,cy);context.rotate(operation.rotation*Math.PI/180);
    if(operation.type==='text'){context.fillStyle='rgba(124,115,255,.72)';drawText(context,local,operation.text);context.restore();return;}
    if(operation.type==='rect'||operation.type==='square'){context.fillRect(local.x,local.y,local.width,local.height);if(stroke)context.strokeRect(local.x,local.y,local.width,local.height);context.restore();return;}
    if(operation.type==='ellipse'){context.beginPath();context.ellipse(0,0,Math.abs(local.width/2),Math.abs(local.height/2),0,0,Math.PI*2);context.fill();if(stroke)context.stroke();context.restore();return;}
    if(operation.type==='diamond')diamondPath(context,local);else starPath(context,local);context.fill();if(stroke)context.stroke();context.restore();
  }
  function renderMask():void {
    const context=mask.getContext('2d');if(!context)return;context.clearRect(0,0,mask.width,mask.height);context.fillStyle='rgba(124,115,255,.30)';context.strokeStyle='rgba(190,186,255,.92)';context.lineWidth=2;
    state.ops.forEach(operation=>drawOp(context,operation));
    const operation=state.selected===undefined?undefined:state.ops[state.selected];
    if(operation){
      const rect=canvasRect(operation),cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;
      context.save();context.translate(cx,cy);context.rotate(operation.rotation*Math.PI/180);context.setLineDash([5,4]);context.strokeStyle='rgba(235,233,255,.95)';context.strokeRect(-rect.width/2,-rect.height/2,rect.width,rect.height);context.restore();
      const corners=operationCornersPx(operation,mask.width,mask.height);context.save();context.setLineDash([]);context.fillStyle='#f4f2ff';context.strokeStyle='#625bea';context.lineWidth=2;
      for(const handle of ['nw','ne','se','sw'] as const){const point=corners[handle];context.fillRect(point.x-4,point.y-4,8,8);context.strokeRect(point.x-4,point.y-4,8,8);}
      const rotatePoint=rotationHandlePx(operation,mask.width,mask.height),topCenter=rotationHandlePx(operation,mask.width,mask.height,0);context.beginPath();context.moveTo(topCenter.x,topCenter.y);context.lineTo(rotatePoint.x,rotatePoint.y);context.stroke();context.beginPath();context.arc(rotatePoint.x,rotatePoint.y,6,0,Math.PI*2);context.fill();context.stroke();context.restore();
    }
    if(state.interaction?.kind==='draw'){const rect=squareLike(state.mode)?squareRect(state.interaction.start,state.interaction.now,mask.width,mask.height):normalize(state.interaction.start,state.interaction.now);drawOp(context,makeOp(state.mode,rect,textInput?.value??''),true);}
  }

  function status(item:Item):string {if(item.status==='processing')return'Processing…';if(item.status==='done')return'Done';if(item.status==='error')return item.error||'Failed';return`${item.width} × ${item.height} · ${item.ratioLabel}`;}
  function badge(text:string,value:string):HTMLElement{const element=document.createElement('span');element.className=`gemini-mask-badge gemini-mask-badge--${value}`;element.textContent=text;return element;}
  function renderQueue():void {
    list.replaceChildren();count.textContent=String(state.items.length);
    for(const item of state.items){
      const card=document.createElement('div');card.className=`gemini-file-card${item.id===state.active?' is-sample':''}${item.status==='error'?' has-error':''}`;card.tabIndex=state.processing?-1:0;card.setAttribute('role','button');card.setAttribute('aria-label',`${state.edit==='individual'?'Edit':'Use'} ${item.file.name}`);
      const image=document.createElement('img');image.src=item.url;image.alt='';const imgWrap=document.createElement('span');imgWrap.className='gemini-file-sample';imgWrap.append(image);
      const copy=document.createElement('div');copy.className='gemini-file-copy';const name=document.createElement('strong');name.textContent=item.file.name;name.title=item.file.name;const meta=document.createElement('small');meta.textContent=status(item);copy.append(name,meta);
      const badges=document.createElement('div');badges.className='gemini-file-badges';if(item.id===state.active)badges.append(badge(state.edit==='individual'?'Editing':'Sample','active'));if(state.edit==='individual')badges.append(badge(!item.ops?.length?'Needs mask':item.origin==='custom'?'Custom':'Shared copy',!item.ops?.length?'empty':item.origin==='custom'?'custom':'shared'));copy.append(badges);
      const removeButton=document.createElement('button');removeButton.type='button';removeButton.className='gemini-file-remove';removeButton.textContent='×';removeButton.title='Remove image';removeButton.disabled=state.processing;removeButton.addEventListener('click',event=>{event.stopPropagation();removeItem(item.id);});
      const choose=()=>{if(!state.processing)void load(item.id);};card.addEventListener('click',choose);card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose();}});card.append(imgWrap,copy,removeButton);list.append(card);
    }
    upload.hidden=state.items.length>0;editor.hidden=!state.items.length;controls();
  }

  async function load(id:string):Promise<void>{
    const item=state.items.find(entry=>entry.id===id);if(!item)return;persist();const generation=++state.generation;
    try{const bitmap=await createImageBitmap(item.file);if(generation!==state.generation){bitmap.close();return;}state.bitmap?.close();state.bitmap=bitmap;state.active=item.id;state.w=item.width;state.h=item.height;activate();
      const scale=Math.min(1,980/item.width,720/item.height),width=Math.max(1,Math.round(item.width*scale)),height=Math.max(1,Math.round(item.height*scale));for(const canvas of [orig,mask,result]){canvas.width=width;canvas.height=height;}
      const context=orig.getContext('2d');if(!context)throw new Error('Canvas preview unavailable');context.drawImage(bitmap,0,0,width,height);sourceName.textContent=item.file.name;sourceMeta.textContent=`${item.width.toLocaleString()} × ${item.height.toLocaleString()} · ${item.ratioLabel} · ${state.edit==='shared'?'shared mask':'individual mask'}`;await renderResult(item);
      selStatus.textContent=state.ops.length?`Mask ready. Drag to any edge or corner, resize from a corner, or rotate with the round handle. ${scopeText()}`:`Draw a mask over the visible ${target}. ${scopeText()}`;renderMask();renderQueue();
    }catch(error){showNotice(error instanceof Error?error.message:'Unable to open this image','error');}
  }
  function autoMode():void {if(state.pref!=='auto'||!state.items.length){updateModeUi();return;}const next:EditMode=mixed()?'individual':'shared';if(next!==state.edit)setEdit(next,'auto');else updateModeUi();}
  function setEdit(mode:EditMode,preference:Preference='manual'):void {if(state.processing)return;persist();state.edit=mode;state.pref=preference;if(mode==='individual')state.items.forEach(ensure);activate();invalidate();const item=active();if(item)sourceMeta.textContent=`${item.width} × ${item.height} · ${item.ratioLabel} · ${mode==='shared'?'shared mask':'individual mask'}`;renderMask();renderQueue();}
  function removeItem(id:string):void {if(state.processing)return;persist();const index=state.items.findIndex(item=>item.id===id);if(index<0)return;const [item]=state.items.splice(index,1);if(item)URL.revokeObjectURL(item.url);invalidate();if(state.active===id){state.bitmap?.close();state.bitmap=undefined;state.active=state.items[0]?.id;if(state.active)void load(state.active);}if(!state.items.length){state.shared=[];state.sharedHist=[];state.sharedRedo=[];state.ops=[];state.history=[];state.redo=[];state.pref='auto';state.edit='shared';state.active=undefined;state.selected=undefined;clearResult();}else autoMode();renderQueue();}
  function clearAll():void {state.generation++;state.bitmap?.close();state.items.forEach(item=>URL.revokeObjectURL(item.url));state.items=[];state.active=undefined;state.w=state.h=0;state.shared=[];state.sharedHist=[];state.sharedRedo=[];state.ops=[];state.history=[];state.redo=[];state.selected=undefined;state.edit='shared';state.pref='auto';state.processing=state.cancel=false;input.value='';worker.reset('Batch cleared');clearResult();progress.hidden=true;summary.textContent='Ready to process';hideNotice();renderMask();renderQueue();}
  async function addFiles(files:readonly File[]):Promise<void>{if(!files.length||state.processing)return;hideNotice();let total=state.items.reduce((sum,item)=>sum+item.file.size,0),large=0,rejected=0,limited=0,accepted=0;for(const file of files){if(state.items.length>=maxFiles||total+file.size>maxTotal){limited++;continue;}if(!['jpg','jpeg','png','webp'].includes(ext(file.name))||file.size>maxFile){file.size>maxFile?large++:rejected++;continue;}try{const bitmap=await createImageBitmap(file),width=bitmap.width,height=bitmap.height;bitmap.close();if(width>maxDim||height>maxDim||width*height>maxPixels){rejected++;continue;}const item:Item={id:crypto.randomUUID(),file,width,height,ratio:width/height,ratioLabel:ratioLabel(width,height),url:URL.createObjectURL(file),status:'ready'};if(state.edit==='individual')ensure(item);state.items.push(item);total+=file.size;accepted++;}catch{rejected++;}}
    input.value='';autoMode();if(accepted&&!state.active){state.active=state.items[0]?.id;if(state.active)await load(state.active);}else renderQueue();const errors=[];if(large)errors.push(`${large} skipped — max 10 MB per image`);if(limited)errors.push(`${limited} skipped — max ${maxFiles} images / 200 MB total`);if(rejected)errors.push(`${rejected} skipped by format or decoded-size limits`);if(errors.length)showNotice(errors.join(' · '),'info');}

  const pointer=(event:PointerEvent):P=>{const bounds=mask.getBoundingClientRect();return{x:clamp((event.clientX-bounds.left)/Math.max(1,bounds.width)),y:clamp((event.clientY-bounds.top)/Math.max(1,bounds.height))};};
  function opAt(point:P):number|undefined {for(let index=state.ops.length-1;index>=0;index--)if(state.ops[index]&&hit(point,state.ops[index]!,mask.width,mask.height))return index;return undefined;}
  function handleAt(point:P,operation:Op):Handle|undefined {const bounds=mask.getBoundingClientRect(),px={x:point.x*bounds.width,y:point.y*bounds.height},size=Math.max(7,Math.min(15,Math.min(operation.rect.width*bounds.width,operation.rect.height*bounds.height)*.28)),corners=operationCornersPx(operation,bounds.width,bounds.height);for(const handle of ['nw','ne','se','sw'] as const){const candidate=corners[handle];if(Math.abs(px.x-candidate.x)<=size&&Math.abs(px.y-candidate.y)<=size)return handle;}return undefined;}
  function rotateHandleHit(point:P,operation:Op):boolean {const bounds=mask.getBoundingClientRect(),candidate=rotationHandlePx(operation,bounds.width,bounds.height),x=point.x*bounds.width,y=point.y*bounds.height;return Math.hypot(x-candidate.x,y-candidate.y)<=11;}
  function resizeLocal(rect:PixelRect,handle:Handle,point:P,constrained:boolean):PixelRect{return resizeRect(rect,handle,point,mask.width,mask.height,constrained);}
  function textRectFor(text:string,current?:PixelRect):PixelRect {
    const width=Math.max(1,mask.width),height=Math.max(1,mask.height),canvas=document.createElement('canvas'),context=canvas.getContext('2d');
    const currentHeightPx=current?current.height*height:Math.max(48,Math.min(150,height*.16));const fontSize=Math.max(18,currentHeightPx*.82);let measured=fontSize*.8*Math.max(1,text.length);
    if(context){context.font=`900 ${fontSize}px sans-serif`;measured=Math.max(measured*.35,context.measureText(text).width);}
    const targetWidthPx=Math.max(fontSize*.9,Math.min(width*.82,measured+fontSize*.28)),targetHeightPx=currentHeightPx;
    const targetWidth=Math.min(.82,targetWidthPx/width),targetHeight=Math.min(.35,targetHeightPx/height),cx=current?current.x+current.width/2:.5,cy=current?current.y+current.height/2:.5;
    return{x:clamp(cx-targetWidth/2,0,1-targetWidth),y:clamp(cy-targetHeight/2,0,1-targetHeight),width:targetWidth,height:targetHeight};
  }

  async function encode(buffer:ArrayBuffer,item:Item,preview:boolean):Promise<{blob:Blob;ext:string}>{const output=state.output==='source'?{mime:mime(item.file),ext:sourceExt(item.file)}:state.output==='png'?{mime:'image/png',ext:'png'}:state.output==='jpeg'?{mime:'image/jpeg',ext:'jpg'}:{mime:'image/webp',ext:'webp'},pixels=new Uint8ClampedArray(buffer);if(preview){const canvas=document.createElement('canvas');canvas.width=item.width;canvas.height=item.height;canvas.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(pixels),item.width,item.height),0,0);result.getContext('2d')?.drawImage(canvas,0,0,result.width,result.height);empty.hidden=true;}if(output.mime==='image/jpeg')flattenJpeg(pixels);const canvas=document.createElement('canvas');canvas.width=item.width;canvas.height=item.height;canvas.getContext('2d')?.putImageData(new ImageData(pixels,item.width,item.height),0,0);const blob=await toBlob(canvas,output.mime,Number(quality.value)/100);return{blob,ext:output.ext};}
  async function process(item:Item,operations:Op[]):Promise<void>{item.status='processing';renderQueue();let bitmap:ImageBitmap|undefined;try{bitmap=await createImageBitmap(item.file);const canvas=document.createElement('canvas');canvas.width=item.width;canvas.height=item.height;const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('Canvas processing unavailable');context.drawImage(bitmap,0,0);const pixels=context.getImageData(0,0,item.width,item.height).data,response=await worker.inpaint(pixels.buffer as ArrayBuffer,item.width,item.height,workerOps(operations,item.width,item.height));if(state.cancel){item.status='ready';return;}const encoded=await encode(response.pixels,item,item.id===state.active);item.result=encoded.blob;item.ext=encoded.ext;item.status='done';if(item.id===state.active)resultLabel.textContent=`${response.repairedPixels.toLocaleString()} pixels repaired`;}catch(error){if(state.cancel){item.status='ready';item.error=undefined;}else{item.status='error';item.error=error instanceof Error?error.message:'Repair failed';item.result=undefined;}}finally{bitmap?.close();renderQueue();}}
  async function run():Promise<void>{if(state.processing)return;persist();const items=preparedItems();if(!items.length)return;state.processing=true;state.cancel=false;invalidate();state.processing=true;progress.hidden=false;cancel.hidden=false;bar.style.width='0%';controls();let done=0,success=0;const current=active(),ordered=current&&items.some(item=>item.id===current.id)?[current,...items.filter(item=>item.id!==current.id)]:items;for(const item of ordered){if(state.cancel)break;progressLabel.textContent=`Processing ${item.file.name}`;progressCount.textContent=`${done+1} / ${ordered.length}`;await process(item,effective(item));if(state.cancel)break;done++;if(item.status==='done')success++;bar.style.width=`${Math.round(done/ordered.length*100)}%`;}const cancelled=state.cancel,failed=ordered.filter(item=>item.status==='error').length;state.processing=false;state.cancel=false;cancel.hidden=true;summary.textContent=cancelled?`${success} repaired · batch cancelled`:`${success} repaired${failed?` · ${failed} failed`:''}`;progressLabel.textContent=cancelled?'Cancelled':'Repair complete';progressCount.textContent=`${success} completed`;download.textContent=success===1?'Download image':'Download ZIP';download.disabled=!success;controls();}
  async function downloadResults():Promise<void>{const successful=state.items.filter(item=>item.result&&item.status==='done');if(!successful.length)return;const files=successful.map(item=>({filename:`${base(item.file.name)}-${suffix}.${item.ext??sourceExt(item.file)}`,blob:item.result!}));if(files.length===1){downloadBlob(files[0]!.blob,files[0]!.filename);return;}download.disabled=true;download.textContent='Building ZIP…';try{const geometry=mixed()?'mixed':(state.items[0]?.ratioLabel??'batch').replace(':','x').replace('.','p');downloadBlob(await createZipBlob(files),`${suffix}-${geometry}-${successful.length}-images.zip`);}catch(error){showNotice(error instanceof Error?error.message:'Unable to build ZIP','error');}finally{download.textContent='Download ZIP';controls();}}
  function controls():void {const preparedCount=preparedItems().length,hasMask=state.ops.length>0,hasResults=state.items.some(item=>item.result);remove.disabled=!preparedCount||state.processing;download.disabled=!hasResults||state.processing;undo.disabled=!state.history.length||state.processing;if(redo)redo.disabled=!state.redo.length||state.processing;clearMask.disabled=!hasMask||state.processing;useShared.disabled=state.processing;add.disabled=state.processing;clear.disabled=state.processing;input.disabled=state.processing;modeButtons.forEach(button=>button.disabled=state.processing);editButtons.forEach(button=>button.disabled=state.processing);outButtons.forEach(button=>button.disabled=state.processing);quality.disabled=state.processing||state.output==='png';if(textInput)textInput.disabled=state.processing;drop.disabled=state.processing;cancel.hidden=!state.processing;cancel.disabled=!state.processing||state.cancel;updateModeUi();}

  function commitKeyboardChange(before:Op[]):void {pushHistory(before);if(state.edit==='individual')state.pref='manual';persist(state.edit==='individual'?'custom':undefined);invalidate();syncText();renderMask();controls();}
  function doUndo():void {const previous=state.history.pop();if(!previous)return;state.redo.push(opsCopy(state.ops));cap(state.redo);state.ops=opsCopy(previous);state.selected=state.ops.length?Math.min(state.selected??state.ops.length-1,state.ops.length-1):undefined;if(state.edit==='individual')state.pref='manual';persist();invalidate();syncText();renderMask();controls();}
  function doRedo():void {const next=state.redo.pop();if(!next)return;state.history.push(opsCopy(state.ops));cap(state.history);state.ops=opsCopy(next);state.selected=state.ops.length?Math.min(state.selected??state.ops.length-1,state.ops.length-1):undefined;if(state.edit==='individual')state.pref='manual';persist();invalidate();syncText();renderMask();controls();}

  editButtons.forEach(button=>button.addEventListener('click',()=>{const mode=button.dataset.editMode as EditMode;if(mode==='shared'||mode==='individual')setEdit(mode,'manual');}));
  useShared.addEventListener('click',()=>{if(state.edit!=='individual'||!state.shared.length)return;const item=active();if(!item)return;pushHistory(state.ops);state.ops=opsCopy(state.shared);state.selected=state.ops.length?state.ops.length-1:undefined;state.pref='manual';persist('shared');invalidate();renderMask();controls();});
  modeButtons.forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.toolMode as Mode)));
  undo.addEventListener('click',doUndo);redo?.addEventListener('click',doRedo);
  clearMask.addEventListener('click',()=>{if(!state.ops.length)return;pushHistory(state.ops);state.ops=[];state.selected=undefined;if(state.edit==='individual')state.pref='manual';persist();invalidate();syncText();renderMask();controls();});

  root.addEventListener('image-canvas-command',(event:Event)=>{
    if(state.processing||!active())return;
    const command=(event as CustomEvent<CanvasCommand>).detail;if(!command||command.type==='undo')return;
    if(command.type==='redo'){doRedo();return;}
    const selectedIndex=state.selected,operation=selectedIndex===undefined?undefined:state.ops[selectedIndex];if(!operation)return;
    const before=opsCopy(state.ops);
    if(command.type==='delete'){
      state.ops.splice(selectedIndex,1);state.selected=state.ops.length?Math.min(selectedIndex,state.ops.length-1):undefined;commitKeyboardChange(before);return;
    }
    if(command.type==='duplicate'){
      const copy=opsCopy([operation])[0];if(!copy)return;
      copy.rect=moveRotatedRect(copy.rect,copy.rotation,12/Math.max(1,mask.width),12/Math.max(1,mask.height),mask.width,mask.height);
      state.ops.push(copy);state.selected=state.ops.length-1;commitKeyboardChange(before);return;
    }
    if(command.type==='nudge'){
      operation.rect=moveRotatedRect(operation.rect,operation.rotation,command.dx/Math.max(1,mask.width),command.dy/Math.max(1,mask.height),mask.width,mask.height);
      if(!sameOps(before,state.ops))commitKeyboardChange(before);
    }
  });

  if(textInput)textInput.addEventListener('input',()=>{if(state.mode!=='text'||!active()||state.processing)return;const text=textInput.value.slice(0,80).trim(),operation=state.selected===undefined?undefined:state.ops[state.selected],before=opsCopy(state.ops);if(!text){if(operation?.type==='text'){state.ops.splice(state.selected!,1);state.selected=state.ops.length?state.ops.length-1:undefined;}}else if(operation?.type==='text'){operation.text=text;operation.rect=textRectFor(text,operation.rect);}else{state.ops.push({type:'text',rect:textRectFor(text),text,rotation:0});state.selected=state.ops.length-1;}if(!sameOps(before,state.ops)){pushHistory(before);if(state.edit==='individual')state.pref='manual';persist(state.edit==='individual'?'custom':undefined);invalidate();renderMask();controls();}});

  mask.addEventListener('pointerdown',event=>{
    if(state.processing||!active())return;event.preventDefault();mask.setPointerCapture(event.pointerId);const point=pointer(event),selected=state.selected===undefined?undefined:state.ops[state.selected];
    if(selected&&rotateHandleHit(point,selected)){const center=operationCenterPx(selected,mask.width,mask.height),angle=Math.atan2(point.y*mask.height-center.y,point.x*mask.width-center.x);state.interaction={kind:'rotate',index:state.selected!,startAngle:angle,startRotation:selected.rotation,before:opsCopy(state.ops)};return;}
    const handle=selected?handleAt(point,selected):undefined;if(selected&&handle){state.interaction={kind:'resize',index:state.selected!,handle,rect:rectCopy(selected.rect),before:opsCopy(state.ops)};return;}
    const index=opAt(point);if(index!==undefined){state.selected=index;const operation=state.ops[index]!;state.interaction={kind:'move',index,start:point,rect:rectCopy(operation.rect),before:opsCopy(state.ops)};if(operation.type==='text'&&textInput)textInput.value=operation.text;renderMask();return;}
    if(state.mode==='text'){mask.releasePointerCapture(event.pointerId);textInput?.focus();return;}state.selected=undefined;state.interaction={kind:'draw',start:point,now:point};renderMask();
  });
  mask.addEventListener('pointermove',event=>{
    if(!mask.hasPointerCapture(event.pointerId)||!state.interaction)return;const point=pointer(event),interaction=state.interaction;if(interaction.kind==='draw'){interaction.now=point;renderMask();return;}const operation=state.ops[interaction.index];if(!operation)return;
    if(interaction.kind==='move'){operation.rect=moveRotatedRect(interaction.rect,operation.rotation,point.x-interaction.start.x,point.y-interaction.start.y,mask.width,mask.height);}
    else if(interaction.kind==='resize'){const local=localPointPx(point,operation,mask.width,mask.height);operation.rect=resizeLocal(interaction.rect,interaction.handle,{x:local.x/mask.width,y:local.y/mask.height},squareLike(operation.type));}
    else{const center=operationCenterPx(operation,mask.width,mask.height),angle=Math.atan2(point.y*mask.height-center.y,point.x*mask.width-center.x),delta=(angle-interaction.startAngle)*180/Math.PI;operation.rotation=normalizeRotation(interaction.startRotation+delta);}
    renderMask();
  });
  const finish=(event:PointerEvent)=>{if(!mask.hasPointerCapture(event.pointerId))return;mask.releasePointerCapture(event.pointerId);const interaction=state.interaction;state.interaction=undefined;if(!interaction)return;let changed=false;if(interaction.kind==='draw'){const rect=squareLike(state.mode)?squareRect(interaction.start,interaction.now,mask.width,mask.height):normalize(interaction.start,interaction.now);if(rect.width>=6/mask.width&&rect.height>=6/mask.height){const before=opsCopy(state.ops);state.ops.push(makeOp(state.mode,rect,textInput?.value??''));pushHistory(before);state.selected=state.ops.length-1;changed=true;}}
    else{const operation=state.ops[interaction.index];if(operation){if(interaction.kind==='rotate')changed=Math.abs(normalizeRotation(operation.rotation-interaction.startRotation))>1e-4;else changed=Math.abs(operation.rect.x-interaction.rect.x)>1e-5||Math.abs(operation.rect.y-interaction.rect.y)>1e-5||Math.abs(operation.rect.width-interaction.rect.width)>1e-5||Math.abs(operation.rect.height-interaction.rect.height)>1e-5;if(changed)pushHistory(interaction.before);}}
    if(changed){if(state.edit==='individual')state.pref='manual';persist(state.edit==='individual'?'custom':undefined);invalidate();}renderMask();controls();
  };
  mask.addEventListener('pointerup',finish);mask.addEventListener('pointercancel',finish);

  outButtons.forEach(button=>button.addEventListener('click',()=>{const value=button.dataset.outputValue as typeof state.output;if(!['source','png','jpeg','webp'].includes(value))return;state.output=value;outButtons.forEach(candidate=>{const selected=candidate===button;candidate.classList.toggle('is-active',selected);candidate.setAttribute('aria-checked',String(selected));});invalidate();controls();}));
  quality.addEventListener('input',()=>{qualityOut.textContent=quality.value;invalidate();controls();});
  cancel.addEventListener('click',()=>{if(!state.processing)return;state.cancel=true;cancel.disabled=true;progressLabel.textContent='Stopping…';worker.reset('Batch cancelled');});
  drop.addEventListener('click',()=>input.click());drop.addEventListener('dragover',event=>{event.preventDefault();drop.classList.add('is-dragging');});drop.addEventListener('dragleave',()=>drop.classList.remove('is-dragging'));drop.addEventListener('drop',event=>{event.preventDefault();drop.classList.remove('is-dragging');void addFiles([...event.dataTransfer!.files]);});
  input.addEventListener('change',()=>void addFiles([...input.files??[]]));add.addEventListener('click',()=>input.click());clear.addEventListener('click',clearAll);remove.addEventListener('click',()=>void run());download.addEventListener('click',()=>void downloadResults());
  setMode(initial);qualityOut.textContent=quality.value;clearResult();renderQueue();renderMask();controls();
}
