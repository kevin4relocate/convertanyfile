import { createZipBlob, downloadBlob } from '../core/download';

type RenameMethod='number'|'prefix'|'suffix'|'replace'|'pattern';
type Item={id:string;file:File;url:string;customName?:string;preparedName?:string;status:'ready'|'done'};
type State={mode:'shared'|'individual';items:Item[];activeId?:string;method:RenameMethod;numberBase:string;numberStart:number;numberPadding:number;prefix:string;suffix:string;find:string;replace:string;pattern:string;patternStart:number;patternPadding:number};

const q=<T extends Element>(root:ParentNode,selector:string):T=>{const el=root.querySelector<T>(selector);if(!el)throw new Error(`Bulk rename is missing ${selector}`);return el;};
const ext=(name:string):string=>name.includes('.')?name.slice(name.lastIndexOf('.')+1).toLowerCase():'';
const base=(name:string):string=>name.replace(/\.[^.]+$/,'');
const clean=(value:string):string=>value.replace(/[\\/:*?"<>|\u0000-\u001f]+/g,'-').replace(/\s+/g,' ').trim().replace(/^\.+|\.+$/g,'').slice(0,180)||'image';
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
  const methodButtons=[...root.querySelectorAll<HTMLButtonElement>('[data-rename-method]')],methodPanels=[...root.querySelectorAll<HTMLElement>('[data-rename-method-panel]')];
  const numberBase=q<HTMLInputElement>(root,'[data-role="number-base"]'),numberStart=q<HTMLInputElement>(root,'[data-role="start-number"]'),numberPadding=q<HTMLSelectElement>(root,'[data-role="padding"]');
  const prefix=q<HTMLInputElement>(root,'[data-role="prefix"]'),suffix=q<HTMLInputElement>(root,'[data-role="suffix"]'),find=q<HTMLInputElement>(root,'[data-role="find-text"]'),replace=q<HTMLInputElement>(root,'[data-role="replace-text"]');
  const pattern=q<HTMLInputElement>(root,'[data-role="pattern"]'),patternStart=q<HTMLInputElement>(root,'[data-role="pattern-start-number"]'),patternPadding=q<HTMLSelectElement>(root,'[data-role="pattern-padding"]');
  const customWrap=q<HTMLElement>(root,'[data-role="custom-name-wrap"]'),custom=q<HTMLInputElement>(root,'[data-role="custom-name"]'),previewList=q<HTMLElement>(root,'[data-role="rename-preview-list"]'),previewCount=q<HTMLElement>(root,'[data-role="preview-count"]');
  const process=q<HTMLButtonElement>(root,'[data-role="process-batch"]'),download=q<HTMLButtonElement>(root,'[data-role="download-batch"]'),ready=q<HTMLElement>(root,'[data-role="ready-count"]');
  const maxFiles=Number(root.dataset.maxFiles||50),maxFile=Number(root.dataset.maxFileBytes||10*1024*1024),maxTotal=200*1024*1024;
  const state:State={mode:'shared',items:[],method:'number',numberBase:numberBase.value||'image',numberStart:Number(numberStart.value)||1,numberPadding:Number(numberPadding.value)||3,prefix:'',suffix:'',find:'',replace:'',pattern:pattern.value||'{name}-{number}',patternStart:Number(patternStart.value)||1,patternPadding:Number(patternPadding.value)||3};
  const active=()=>state.items.find(item=>item.id===state.activeId);
  const hideNotice=()=>{notice.hidden=true;notice.textContent='';delete notice.dataset.type;};
  const showNotice=(text:string)=>{notice.hidden=false;notice.dataset.type='info';notice.textContent=text;};

  function sequence(index:number,start:number,paddingValue:number):string{return String(start+index).padStart(Math.max(1,Math.min(8,paddingValue)),'0');}
  function generated(item:Item,index:number):string{
    const sourceExt=ext(item.file.name),stem=base(item.file.name);
    if(state.mode==='individual'&&item.customName?.trim())return withSourceExtension(item.customName,sourceExt);
    let value=stem;
    if(state.method==='number')value=`${state.numberBase.trim()||'image'}-${sequence(index,state.numberStart,state.numberPadding)}`;
    else if(state.method==='prefix')value=`${state.prefix}${stem}`;
    else if(state.method==='suffix')value=`${stem}${state.suffix}`;
    else if(state.method==='replace')value=state.find?stem.split(state.find).join(state.replace):stem;
    else{
      const number=sequence(index,state.patternStart,state.patternPadding);
      value=state.pattern.replaceAll('{name}',stem).replaceAll('{number}',number).replaceAll('{ext}',sourceExt);
    }
    return withSourceExtension(value,sourceExt);
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

  function syncMethodUi():void{
    methodButtons.forEach(button=>{const selected=button.dataset.renameMethod===state.method;button.classList.toggle('is-active',selected);button.setAttribute('aria-pressed',String(selected));});
    methodPanels.forEach(panel=>{panel.hidden=panel.dataset.renameMethodPanel!==state.method;});
  }

  function renderPreview(map:Map<string,string>):void{
    previewList.replaceChildren();previewCount.textContent=String(state.items.length);
    state.items.forEach((item,index)=>{
      const row=document.createElement('div');row.className=`rename-preview-row${item.id===state.activeId?' is-active':''}`;row.tabIndex=0;row.setAttribute('role','button');row.setAttribute('aria-label',`Edit ${item.file.name}`);
      const ordinal=document.createElement('span');ordinal.className='rename-preview-row__index';ordinal.textContent=String(index+1).padStart(2,'0');
      const original=document.createElement('strong');original.textContent=item.file.name;original.title=item.file.name;
      const arrow=document.createElement('span');arrow.className='rename-preview-row__arrow';arrow.textContent='→';
      const result=document.createElement('span');result.textContent=map.get(item.id)||'';result.title=result.textContent;
      const select=()=>{state.activeId=item.id;render();};row.addEventListener('click',select);row.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}});
      row.append(ordinal,original,arrow,result);previewList.append(row);
    });
  }

  function invalidate():void{state.items.forEach(item=>{item.status='ready';item.preparedName=undefined;});download.disabled=true;render();}
  function updateSelection():void{const item=active();customWrap.hidden=state.mode!=='individual'||!item;custom.value=item?.customName||'';}
  function render():void{
    const map=names();list.replaceChildren();count.textContent=String(state.items.length);root.dataset.hasItems=String(state.items.length>0);ready.textContent=`${state.items.length} image${state.items.length===1?'':'s'} ready`;process.disabled=!state.items.length;
    state.items.forEach(item=>{const card=document.createElement('div');card.className=`rename-card${item.id===state.activeId?' is-active':''}`;card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',`Rename ${item.file.name}`);const img=document.createElement('img');img.src=item.url;img.alt='';const copy=document.createElement('div');copy.className='rename-card__copy';const name=document.createElement('strong');name.textContent=item.file.name;const next=document.createElement('small');next.textContent=`→ ${map.get(item.id)||''}`;const badge=document.createElement('span');badge.className=`rename-badge${item.customName?.trim()?' custom':''}`;badge.textContent=item.customName?.trim()?'CUSTOM':'SHARED';copy.append(name,next,badge);const remove=document.createElement('button');remove.type='button';remove.className='rename-remove';remove.textContent='×';remove.title='Remove image';remove.addEventListener('click',event=>{event.stopPropagation();removeItem(item.id);});const select=()=>{state.activeId=item.id;render();};card.addEventListener('click',select);card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}});card.append(img,copy,remove);list.append(card);});
    syncMethodUi();updateSelection();renderPreview(map);
  }

  async function addFiles(files:readonly File[]):Promise<void>{if(!files.length)return;hideNotice();let bytes=state.items.reduce((sum,item)=>sum+item.file.size,0),skipped=0;for(const file of files){if(state.items.length>=maxFiles||bytes+file.size>maxTotal||file.size>maxFile||!supported.has(ext(file.name))){skipped++;continue;}state.items.push({id:crypto.randomUUID(),file,url:URL.createObjectURL(file),status:'ready'});bytes+=file.size;}input.value='';if(!state.activeId&&state.items[0])state.activeId=state.items[0].id;invalidate();if(skipped)showNotice(`${skipped} file${skipped===1?'':'s'} skipped by format, size, or batch limits.`);}
  function removeItem(id:string):void{const index=state.items.findIndex(item=>item.id===id);if(index<0)return;const [item]=state.items.splice(index,1);if(item)URL.revokeObjectURL(item.url);if(state.activeId===id)state.activeId=state.items[Math.min(index,state.items.length-1)]?.id;invalidate();}
  function clearAll():void{state.items.forEach(item=>URL.revokeObjectURL(item.url));state.items=[];state.activeId=undefined;download.disabled=true;hideNotice();render();}
  function setMode(mode:'shared'|'individual'):void{state.mode=mode;root.dataset.platformScope=mode;scope.forEach(button=>{const selected=button.dataset.editScope===mode;button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-checked',String(selected));button.classList.toggle('is-active',selected);});summary.textContent=mode==='shared'?'One rename method applies to the batch.':'Select an image to override only its filename.';invalidate();}
  function prepare():void{const map=names();state.items.forEach(item=>{item.preparedName=map.get(item.id);item.status='done';});download.disabled=!state.items.length;render();download.disabled=!state.items.length;}
  async function downloadFiles():Promise<void>{const files=state.items.filter(item=>item.preparedName).map(item=>({filename:item.preparedName!,blob:item.file as Blob}));if(!files.length)return;if(files.length===1){downloadBlob(files[0].blob,files[0].filename);return;}downloadBlob(await createZipBlob(files),'renamed-images.zip');}

  methodButtons.forEach(button=>button.addEventListener('click',()=>{const value=button.dataset.renameMethod as RenameMethod|undefined;if(!value||state.method===value)return;state.method=value;invalidate();}));
  numberBase.addEventListener('input',()=>{state.numberBase=numberBase.value;invalidate();});numberStart.addEventListener('input',()=>{state.numberStart=Math.max(0,Number(numberStart.value)||0);invalidate();});numberPadding.addEventListener('change',()=>{state.numberPadding=Math.max(1,Math.min(8,Number(numberPadding.value)||1));invalidate();});
  prefix.addEventListener('input',()=>{state.prefix=prefix.value;invalidate();});suffix.addEventListener('input',()=>{state.suffix=suffix.value;invalidate();});find.addEventListener('input',()=>{state.find=find.value;invalidate();});replace.addEventListener('input',()=>{state.replace=replace.value;invalidate();});
  pattern.addEventListener('input',()=>{state.pattern=pattern.value||'{name}-{number}';invalidate();});patternStart.addEventListener('input',()=>{state.patternStart=Math.max(0,Number(patternStart.value)||0);invalidate();});patternPadding.addEventListener('change',()=>{state.patternPadding=Math.max(1,Math.min(8,Number(patternPadding.value)||1));invalidate();});
  custom.addEventListener('input',()=>{const item=active();if(!item)return;item.customName=custom.value;invalidate();});scope.forEach(button=>button.addEventListener('click',()=>{const mode=button.dataset.editScope;if(mode==='shared'||mode==='individual')setMode(mode);}));
  drop.addEventListener('dragover',event=>{event.preventDefault();drop.classList.add('is-dragging');});drop.addEventListener('dragleave',()=>drop.classList.remove('is-dragging'));drop.addEventListener('drop',event=>{event.preventDefault();drop.classList.remove('is-dragging');void addFiles([...event.dataTransfer!.files]);});input.addEventListener('change',()=>void addFiles([...input.files??[]]));add.addEventListener('click',()=>input.click());clear.addEventListener('click',clearAll);process.addEventListener('click',prepare);download.addEventListener('click',()=>void downloadFiles());
  render();
}
