import { downloadResultBatch } from '../core/download';
import { createImageFileAdmission } from '../core/file-admission';

type RenameStyle = 'new' | 'keep';
type NumberPosition = 'before' | 'after';
type Item = { id:string; file:File; url:string; customName?:string; preparedName?:string; status:'ready'|'done' };
type State = {
  mode:'shared'|'individual'; items:Item[]; activeId?:string;
  renameStyle:RenameStyle; newName:string; prefix:string; suffix:string;
  numbering:boolean; numberPosition:NumberPosition; start:number; padding:number;
  advanced:boolean; pattern:string;
};

const q=<T extends Element>(root:ParentNode,selector:string):T=>{const el=root.querySelector<T>(selector);if(!el)throw new Error(`Bulk rename is missing ${selector}`);return el;};
const ext=(name:string):string=>name.includes('.')?name.slice(name.lastIndexOf('.')+1).toLowerCase():'';
const base=(name:string):string=>name.replace(/\.[^.]+$/,'');
const sanitize=(value:string):string=>value.replace(/[\\/:*?"<>|\u0000-\u001f]+/g,'-').replace(/\s+/g,' ').trim().replace(/^\.+|\.+$/g,'').slice(0,180);
const clean=(value:string):string=>sanitize(value)||'image';
const piece=(value:string):string=>value.replace(/[\\/:*?"<>|\u0000-\u001f]+/g,'-').replace(/\s+/g,' ').slice(0,80);
const supported=new Set(['jpg','jpeg','png','webp']);

function withSourceExtension(name:string,sourceExt:string):string{
  const candidate=clean(name),candidateExt=ext(candidate);
  const stem=supported.has(candidateExt)?clean(base(candidate)):candidate;
  return `${stem}.${sourceExt}`;
}

export function mountBulkRenameImages(root:HTMLElement):void{
  root.dataset.platformRuntime='batch-v1';root.dataset.platformScope='shared';
  const notice=q<HTMLElement>(root,'[data-role="notice"]'),input=q<HTMLInputElement>(root,'[data-role="file-input"]'),drop=q<HTMLElement>(root,'[data-role="batch-dropzone"]'),list=q<HTMLElement>(root,'[data-role="batch-list"]'),count=q<HTMLElement>(root,'[data-role="batch-count"]'),summary=q<HTMLElement>(root,'[data-role="mode-summary"]');
  const add=q<HTMLButtonElement>(root,'[data-role="add-more"]'),clear=q<HTMLButtonElement>(root,'[data-role="clear-all"]'),scope=[...root.querySelectorAll<HTMLButtonElement>('[data-edit-scope]')];
  const styleButtons=[...root.querySelectorAll<HTMLButtonElement>('[data-rename-style]')],newGroup=q<HTMLElement>(root,'[data-rename-group="new"]'),keepGroup=q<HTMLElement>(root,'[data-rename-group="keep"]'),friendlyFields=q<HTMLElement>(root,'[data-role="friendly-fields"]');
  const newName=q<HTMLInputElement>(root,'[data-role="new-name"]'),prefix=q<HTMLInputElement>(root,'[data-role="prefix"]'),suffix=q<HTMLInputElement>(root,'[data-role="suffix"]'),numbering=q<HTMLInputElement>(root,'[data-role="numbering"]'),numberingOptions=q<HTMLElement>(root,'[data-role="numbering-options"]'),start=q<HTMLInputElement>(root,'[data-role="start-number"]');
  const paddingButtons=[...root.querySelectorAll<HTMLButtonElement>('[data-padding]')],positionButtons=[...root.querySelectorAll<HTMLButtonElement>('[data-number-position]')],advancedEnabled=q<HTMLInputElement>(root,'[data-role="advanced-enabled"]'),pattern=q<HTMLInputElement>(root,'[data-role="pattern"]');
  const customWrap=q<HTMLElement>(root,'[data-role="custom-name-wrap"]'),custom=q<HTMLInputElement>(root,'[data-role="custom-name"]'),previewList=q<HTMLElement>(root,'[data-role="preview-list"]'),previewNote=q<HTMLElement>(root,'[data-role="preview-note"]'),process=q<HTMLButtonElement>(root,'[data-role="process-batch"]'),download=q<HTMLButtonElement>(root,'[data-role="download-batch"]'),ready=q<HTMLElement>(root,'[data-role="ready-count"]');
  const maxFiles=Number(root.dataset.maxFiles||50),maxFile=Number(root.dataset.maxFileBytes||10*1024*1024),maxTotal=200*1024*1024;
  const state:State={mode:'shared',items:[],renameStyle:'new',newName:newName.value||'image',prefix:'',suffix:'',numbering:true,numberPosition:'after',start:Number(start.value)||1,padding:3,advanced:false,pattern:pattern.value||'{name}-{number}'};
  const active=()=>state.items.find(item=>item.id===state.activeId);
  const hideNotice=()=>{notice.hidden=true;notice.textContent='';delete notice.dataset.type;};
  const showNotice=(text:string)=>{notice.hidden=false;notice.dataset.type='info';notice.textContent=text;};

  function generated(item:Item,index:number):string{
    const sourceExt=ext(item.file.name);
    if(state.mode==='individual'&&item.customName?.trim())return withSourceExtension(item.customName,sourceExt);
    const number=String(state.start+index).padStart(Math.max(1,Math.min(8,state.padding)),'0');

    if(state.advanced){
      const hadExtToken=state.pattern.includes('{ext}');
      let value=state.pattern.replaceAll('{name}',base(item.file.name)).replaceAll('{number}',number).replaceAll('{ext}',sourceExt);
      value=clean(value);
      if(hadExtToken&&ext(value)===sourceExt)return value;
      return withSourceExtension(value,sourceExt);
    }

    let stem=state.renameStyle==='keep'
      ? `${piece(state.prefix)}${base(item.file.name)}${piece(state.suffix)}`
      : clean(state.newName);
    stem=clean(stem);
    if(state.numbering)stem=state.numberPosition==='before'?`${number}-${stem}`:`${stem}-${number}`;
    return withSourceExtension(stem,sourceExt);
  }

  function names():Map<string,string>{
    const result=new Map<string,string>(),used=new Map<string,number>();
    state.items.forEach((item,index)=>{
      let name=generated(item,index),key=name.toLowerCase(),seen=used.get(key)||0;used.set(key,seen+1);
      if(seen){const extension=ext(name),stem=base(name);name=`${stem}-${seen+1}.${extension}`;key=name.toLowerCase();while(used.has(key)){seen++;name=`${stem}-${seen+1}.${extension}`;key=name.toLowerCase();}used.set(key,1);}
      result.set(item.id,name);
    });
    return result;
  }

  function syncControls():void{
    styleButtons.forEach(button=>{const selected=button.dataset.renameStyle===state.renameStyle;button.classList.toggle('is-active',selected);button.setAttribute('aria-pressed',String(selected));});
    newGroup.hidden=state.renameStyle!=='new';keepGroup.hidden=state.renameStyle!=='keep';
    numbering.checked=state.numbering;numberingOptions.hidden=!state.numbering;
    paddingButtons.forEach(button=>button.classList.toggle('is-active',Number(button.dataset.padding)===state.padding));
    positionButtons.forEach(button=>button.classList.toggle('is-active',button.dataset.numberPosition===state.numberPosition));
    advancedEnabled.checked=state.advanced;friendlyFields.hidden=state.advanced;pattern.disabled=!state.advanced;
  }

  function renderPreview(map:Map<string,string>):void{
    previewList.replaceChildren();
    const visible=state.items.slice(0,4);
    previewNote.textContent=state.items.length>4?`Showing 4 of ${state.items.length} files`:`Showing ${state.items.length} ${state.items.length===1?'file':'files'}`;
    if(!visible.length){const empty=document.createElement('div');empty.className='rename-preview-empty';empty.textContent='Add images to see filename examples.';previewList.append(empty);return;}
    for(const item of visible){
      const row=document.createElement('div');row.className='rename-preview-row';
      const before=document.createElement('div');before.className='rename-preview-name';before.textContent=item.file.name;before.title=item.file.name;
      const arrow=document.createElement('div');arrow.className='rename-preview-arrow';arrow.textContent='→';
      const resultName=map.get(item.id)||'—';
      const after=document.createElement('div');after.className='rename-preview-name rename-preview-result';after.textContent=resultName;after.title=resultName;
      row.append(before,arrow,after);previewList.append(row);
    }
  }

  function invalidate():void{state.items.forEach(item=>{item.status='ready';item.preparedName=undefined;});render();}
  function updateSelection():void{const item=active();customWrap.hidden=state.mode!=='individual'||!item;custom.value=item?.customName||'';}
  function render():void{
    const map=names();const preparedCount=state.items.filter(item=>item.status==='done'&&item.preparedName).length;const downloadCount=preparedCount||state.items.length;syncControls();list.replaceChildren();count.textContent=String(state.items.length);root.dataset.hasItems=String(state.items.length>0);ready.textContent=`${state.items.length} image${state.items.length===1?'':'s'} ready`;process.disabled=!state.items.length;download.textContent=downloadCount>1?'Download ZIP':'Download image';download.disabled=!preparedCount;
    state.items.forEach(item=>{
      const card=document.createElement('div');card.className=`rename-card${item.id===state.activeId?' is-active':''}`;card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',`Rename ${item.file.name}`);
      const img=document.createElement('img');img.src=item.url;img.alt='';
      const copy=document.createElement('div');copy.className='rename-card__copy';const name=document.createElement('strong');name.textContent=item.file.name;const next=document.createElement('small');next.textContent=`→ ${map.get(item.id)||''}`;const badge=document.createElement('span');badge.className=`rename-badge${item.customName?.trim()?' custom':''}`;badge.textContent=item.customName?.trim()?'CUSTOM':'SHARED';copy.append(name,next,badge);
      const remove=document.createElement('button');remove.type='button';remove.className='rename-remove';remove.textContent='×';remove.title='Remove image';remove.addEventListener('click',event=>{event.stopPropagation();removeItem(item.id);});
      const select=()=>{state.activeId=item.id;render();};card.addEventListener('click',select);card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}});card.append(img,copy,remove);list.append(card);
    });
    renderPreview(map);updateSelection();
  }

  async function addFiles(files:readonly File[]):Promise<void>{
    if(!files.length)return;
    hideNotice();
    const admission=createImageFileAdmission(state.items,{
      maxFiles,maxFileBytes:maxFile,maxTotalBytes:maxTotal,acceptedExtensions:['jpg','jpeg','png','webp'],
    });
    let skipped=0;
    for(const file of files){
      if(admission.check(file)){skipped++;continue;}
      admission.accept(file);
      state.items.push({id:crypto.randomUUID(),file,url:URL.createObjectURL(file),status:'ready'});
    }
    input.value='';
    if(!state.activeId&&state.items[0])state.activeId=state.items[0].id;
    invalidate();
    if(skipped)showNotice(`${skipped} file${skipped===1?'':'s'} skipped by format, size, or batch limits.`);
  }
  function removeItem(id:string):void{const index=state.items.findIndex(item=>item.id===id);if(index<0)return;const [item]=state.items.splice(index,1);if(item)URL.revokeObjectURL(item.url);if(state.activeId===id)state.activeId=state.items[Math.min(index,state.items.length-1)]?.id;invalidate();}
  function clearAll():void{state.items.forEach(item=>URL.revokeObjectURL(item.url));state.items=[];state.activeId=undefined;hideNotice();render();}
  function setMode(mode:'shared'|'individual'):void{state.mode=mode;root.dataset.platformScope=mode;scope.forEach(button=>{const selected=button.dataset.editScope===mode;button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-checked',String(selected));button.classList.toggle('is-active',selected);});summary.textContent=mode==='shared'?'One naming setup applies to the batch.':'Select an image to override only its filename.';invalidate();}
  function prepare():void{const map=names();state.items.forEach(item=>{item.preparedName=map.get(item.id);item.status='done';});render();}
  async function downloadFiles():Promise<void>{const files=state.items.filter(item=>item.preparedName).map(item=>({filename:item.preparedName!,blob:item.file as Blob}));await downloadResultBatch(files,'renamed-images.zip');}

  styleButtons.forEach(button=>button.addEventListener('click',()=>{const style=button.dataset.renameStyle;if(style!=='new'&&style!=='keep')return;state.renameStyle=style;invalidate();}));
  newName.addEventListener('input',()=>{state.newName=newName.value;invalidate();});
  prefix.addEventListener('input',()=>{state.prefix=prefix.value;invalidate();});
  suffix.addEventListener('input',()=>{state.suffix=suffix.value;invalidate();});
  numbering.addEventListener('change',()=>{state.numbering=numbering.checked;invalidate();});
  start.addEventListener('input',()=>{state.start=Math.max(0,Number(start.value)||0);invalidate();});
  paddingButtons.forEach(button=>button.addEventListener('click',()=>{state.padding=Math.max(1,Math.min(8,Number(button.dataset.padding)||1));invalidate();}));
  positionButtons.forEach(button=>button.addEventListener('click',()=>{const value=button.dataset.numberPosition;if(value==='before'||value==='after'){state.numberPosition=value;invalidate();}}));
  advancedEnabled.addEventListener('change',()=>{state.advanced=advancedEnabled.checked;invalidate();});
  pattern.addEventListener('input',()=>{state.pattern=pattern.value||'{name}-{number}';invalidate();});
  custom.addEventListener('input',()=>{const item=active();if(!item)return;item.customName=custom.value;invalidate();});
  scope.forEach(button=>button.addEventListener('click',()=>{const mode=button.dataset.editScope;if(mode==='shared'||mode==='individual')setMode(mode);}));
  drop.addEventListener('dragover',event=>{event.preventDefault();drop.classList.add('is-dragging');});drop.addEventListener('dragleave',()=>drop.classList.remove('is-dragging'));drop.addEventListener('drop',event=>{event.preventDefault();drop.classList.remove('is-dragging');void addFiles([...event.dataTransfer!.files]);});input.addEventListener('change',()=>void addFiles([...input.files??[]]));add.addEventListener('click',()=>input.click());clear.addEventListener('click',clearAll);process.addEventListener('click',prepare);download.addEventListener('click',()=>void downloadFiles());
  render();
}
