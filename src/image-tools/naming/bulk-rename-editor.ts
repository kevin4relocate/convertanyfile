import { createZipBlob, downloadBlob } from '../core/download';

type Item = { id:string; file:File; url:string; customName?:string; preparedName?:string; status:'ready'|'done' };
type State = { mode:'shared'|'individual'; items:Item[]; activeId?:string; pattern:string; start:number; padding:number };

const q=<T extends Element>(root:ParentNode,selector:string):T=>{const el=root.querySelector<T>(selector);if(!el)throw new Error(`Bulk rename is missing ${selector}`);return el;};
const ext=(name:string):string=>name.includes('.')?name.slice(name.lastIndexOf('.')+1).toLowerCase():'';
const base=(name:string):string=>name.replace(/\.[^.]+$/,'');
const clean=(value:string):string=>value.replace(/[\\/:*?"<>|\u0000-\u001f]+/g,'-').replace(/\s+/g,' ').trim().replace(/^\.+|\.+$/g,'').slice(0,180)||'image';
const supported=new Set(['jpg','jpeg','png','webp']);

function withSourceExtension(name:string,sourceExt:string):string{
  const candidate=clean(name),candidateExt=ext(candidate);
  // Rename never converts bytes. If a user types another supported image
  // extension, treat it as part of the requested filename and replace it with
  // the source extension so file contents and filename always agree.
  const stem=supported.has(candidateExt)?clean(base(candidate)):candidate;
  return `${stem}.${sourceExt}`;
}

export function mountBulkRenameImages(root:HTMLElement):void{
  root.dataset.platformRuntime='batch-v1';root.dataset.platformScope='shared';
  const notice=q<HTMLElement>(root,'[data-role="notice"]'),input=q<HTMLInputElement>(root,'[data-role="file-input"]'),drop=q<HTMLElement>(root,'[data-role="batch-dropzone"]'),list=q<HTMLElement>(root,'[data-role="batch-list"]'),count=q<HTMLElement>(root,'[data-role="batch-count"]'),summary=q<HTMLElement>(root,'[data-role="mode-summary"]');
  const add=q<HTMLButtonElement>(root,'[data-role="add-more"]'),clear=q<HTMLButtonElement>(root,'[data-role="clear-all"]'),scope=[...root.querySelectorAll<HTMLButtonElement>('[data-edit-scope]')],pattern=q<HTMLInputElement>(root,'[data-role="pattern"]'),start=q<HTMLInputElement>(root,'[data-role="start-number"]'),padding=q<HTMLInputElement>(root,'[data-role="padding"]');
  const customWrap=q<HTMLElement>(root,'[data-role="custom-name-wrap"]'),custom=q<HTMLInputElement>(root,'[data-role="custom-name"]'),selectedOriginal=q<HTMLElement>(root,'[data-role="selected-original"]'),selectedResult=q<HTMLElement>(root,'[data-role="selected-result"]'),process=q<HTMLButtonElement>(root,'[data-role="process-batch"]'),download=q<HTMLButtonElement>(root,'[data-role="download-batch"]'),ready=q<HTMLElement>(root,'[data-role="ready-count"]');
  const maxFiles=Number(root.dataset.maxFiles||50),maxFile=Number(root.dataset.maxFileBytes||10*1024*1024),maxTotal=200*1024*1024;
  const state:State={mode:'shared',items:[],pattern:pattern.value,start:Number(start.value)||1,padding:Number(padding.value)||3};
  const active=()=>state.items.find(item=>item.id===state.activeId);
  const hideNotice=()=>{notice.hidden=true;notice.textContent='';delete notice.dataset.type;};
  const showNotice=(text:string)=>{notice.hidden=false;notice.dataset.type='info';notice.textContent=text;};

  function generated(item:Item,index:number):string{
    const sourceExt=ext(item.file.name);
    if(state.mode==='individual'&&item.customName?.trim())return withSourceExtension(item.customName,sourceExt);
    const number=String(state.start+index).padStart(Math.max(1,Math.min(8,state.padding)),'0');
    const hadExtToken=state.pattern.includes('{ext}');
    let value=state.pattern.replaceAll('{name}',base(item.file.name)).replaceAll('{number}',number).replaceAll('{ext}',sourceExt);
    value=clean(value);
    if(hadExtToken&&ext(value)===sourceExt)return value;
    return withSourceExtension(value,sourceExt);
  }

  function names():Map<string,string>{
    const result=new Map<string,string>(),used=new Map<string,number>();
    state.items.forEach((item,index)=>{let name=generated(item,index),key=name.toLowerCase(),seen=used.get(key)||0;used.set(key,seen+1);if(seen){const extension=ext(name),stem=base(name);name=`${stem}-${seen+1}.${extension}`;key=name.toLowerCase();while(used.has(key)){seen++;name=`${stem}-${seen+1}.${extension}`;key=name.toLowerCase();}used.set(key,1);}result.set(item.id,name);});
    return result;
  }

  function invalidate():void{state.items.forEach(item=>{item.status='ready';item.preparedName=undefined;});download.disabled=true;render();}
  function updateSelection():void{const item=active(),map=names();customWrap.hidden=state.mode!=='individual'||!item;custom.value=item?.customName||'';selectedOriginal.textContent=item?.file.name||'Select an image';selectedResult.textContent=item?map.get(item.id)||'—':'New filename appears here';}
  function render():void{
    const map=names();list.replaceChildren();count.textContent=String(state.items.length);root.dataset.hasItems=String(state.items.length>0);ready.textContent=`${state.items.length} image${state.items.length===1?'':'s'} ready`;process.disabled=!state.items.length;
    state.items.forEach(item=>{const card=document.createElement('div');card.className=`rename-card${item.id===state.activeId?' is-active':''}`;card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',`Rename ${item.file.name}`);const img=document.createElement('img');img.src=item.url;img.alt='';const copy=document.createElement('div');copy.className='rename-card__copy';const name=document.createElement('strong');name.textContent=item.file.name;const next=document.createElement('small');next.textContent=`→ ${map.get(item.id)||''}`;const badge=document.createElement('span');badge.className=`rename-badge${item.customName?.trim()?' custom':''}`;badge.textContent=item.customName?.trim()?'CUSTOM':'SHARED';copy.append(name,next,badge);const remove=document.createElement('button');remove.type='button';remove.className='rename-remove';remove.textContent='×';remove.title='Remove image';remove.addEventListener('click',event=>{event.stopPropagation();removeItem(item.id);});const select=()=>{state.activeId=item.id;render();};card.addEventListener('click',select);card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}});card.append(img,copy,remove);list.append(card);});
    updateSelection();
  }

  async function addFiles(files:readonly File[]):Promise<void>{if(!files.length)return;hideNotice();let bytes=state.items.reduce((sum,item)=>sum+item.file.size,0),skipped=0;for(const file of files){if(state.items.length>=maxFiles||bytes+file.size>maxTotal||file.size>maxFile||!supported.has(ext(file.name))){skipped++;continue;}state.items.push({id:crypto.randomUUID(),file,url:URL.createObjectURL(file),status:'ready'});bytes+=file.size;}input.value='';if(!state.activeId&&state.items[0])state.activeId=state.items[0].id;invalidate();if(skipped)showNotice(`${skipped} file${skipped===1?'':'s'} skipped by format, size, or batch limits.`);}
  function removeItem(id:string):void{const index=state.items.findIndex(item=>item.id===id);if(index<0)return;const [item]=state.items.splice(index,1);if(item)URL.revokeObjectURL(item.url);if(state.activeId===id)state.activeId=state.items[Math.min(index,state.items.length-1)]?.id;invalidate();}
  function clearAll():void{state.items.forEach(item=>URL.revokeObjectURL(item.url));state.items=[];state.activeId=undefined;download.disabled=true;hideNotice();render();}
  function setMode(mode:'shared'|'individual'):void{state.mode=mode;root.dataset.platformScope=mode;scope.forEach(button=>{const selected=button.dataset.editScope===mode;button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-checked',String(selected));button.classList.toggle('is-active',selected);});summary.textContent=mode==='shared'?'One filename pattern applies to the batch.':'Select an image to override only its filename.';invalidate();}
  function prepare():void{const map=names();state.items.forEach(item=>{item.preparedName=map.get(item.id);item.status='done';});download.disabled=!state.items.length;render();download.disabled=!state.items.length;}
  async function downloadFiles():Promise<void>{const files=state.items.filter(item=>item.preparedName).map(item=>({filename:item.preparedName!,blob:item.file as Blob}));if(!files.length)return;if(files.length===1){downloadBlob(files[0].blob,files[0].filename);return;}downloadBlob(await createZipBlob(files),'renamed-images.zip');}

  pattern.addEventListener('input',()=>{state.pattern=pattern.value||'image-{number}';invalidate();});start.addEventListener('input',()=>{state.start=Math.max(0,Number(start.value)||0);invalidate();});padding.addEventListener('input',()=>{state.padding=Math.max(1,Math.min(8,Number(padding.value)||1));invalidate();});custom.addEventListener('input',()=>{const item=active();if(!item)return;item.customName=custom.value;invalidate();});
  scope.forEach(button=>button.addEventListener('click',()=>{const mode=button.dataset.editScope;if(mode==='shared'||mode==='individual')setMode(mode);}));
  drop.addEventListener('dragover',event=>{event.preventDefault();drop.classList.add('is-dragging');});drop.addEventListener('dragleave',()=>drop.classList.remove('is-dragging'));drop.addEventListener('drop',event=>{event.preventDefault();drop.classList.remove('is-dragging');void addFiles([...event.dataTransfer!.files]);});input.addEventListener('change',()=>void addFiles([...input.files??[]]));add.addEventListener('click',()=>input.click());clear.addEventListener('click',clearAll);process.addEventListener('click',prepare);download.addEventListener('click',()=>void downloadFiles());
  render();
}
