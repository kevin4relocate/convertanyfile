import { createZipBlob, downloadBlob } from '../core/download';

type Kind = 'text' | 'logo';
type Item = { id:string; file:File; url:string; width:number; height:number; output?:Blob };
type WatermarkState = { kind:Kind; text:string; color:string; bold:boolean; textScale:number; logoScale:number; opacity:number; x:number; y:number; logoFile?:File; logoUrl?:string; logoImage?:HTMLImageElement };

const q=<T extends Element>(root:ParentNode,selector:string):T=>{const el=root.querySelector<T>(selector);if(!el)throw new Error(`Add Watermark is missing ${selector}`);return el;};
const supported=new Set(['jpg','jpeg','png','webp']);
const ext=(name:string)=>name.includes('.')?name.slice(name.lastIndexOf('.')+1).toLowerCase():'';
const stem=(name:string)=>name.replace(/\.[^.]+$/,'');
const loadImage=(url:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Unable to decode image.'));image.src=url;});
const canvasBlob=(canvas:HTMLCanvasElement,type:string,quality?:number)=>new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Unable to encode image.')),type,quality));
const outputMime=(file:File):string=>file.type==='image/png'?'image/png':file.type==='image/webp'?'image/webp':'image/jpeg';
const outputExt=(file:File):string=>file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';

function fitSize(width:number,height:number,max=1000):{width:number;height:number}{
  const scale=Math.min(1,max/Math.max(width,height));
  return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}

function drawWatermark(ctx:CanvasRenderingContext2D,width:number,height:number,state:WatermarkState):void{
  ctx.save();ctx.globalAlpha=state.opacity;
  const cx=state.x*width,cy=state.y*height;
  if(state.kind==='text'){
    const size=Math.max(10,state.textScale*width);
    ctx.font=`${state.bold?'700':'400'} ${size}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle=state.color;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(state.text||'Watermark',cx,cy,Math.max(20,width*.9));
  }else if(state.logoImage){
    const logo=state.logoImage;const drawWidth=Math.max(10,state.logoScale*width);const drawHeight=drawWidth*(logo.naturalHeight/logo.naturalWidth);
    ctx.drawImage(logo,cx-drawWidth/2,cy-drawHeight/2,drawWidth,drawHeight);
  }
  ctx.restore();
}

export function mountAddWatermark(root:HTMLElement):void{
  root.dataset.platformRuntime='batch-v1';root.dataset.platformScope='shared';
  const notice=q<HTMLElement>(root,'[data-role="notice"]'),input=q<HTMLInputElement>(root,'[data-role="file-input"]'),drop=q<HTMLElement>(root,'[data-role="batch-dropzone"]');
  const editor=q<HTMLElement>(root,'[data-role="editor"]'),list=q<HTMLElement>(root,'[data-role="batch-list"]'),count=q<HTMLElement>(root,'[data-role="batch-count"]'),activeName=q<HTMLElement>(root,'[data-role="active-name"]');
  const add=q<HTMLButtonElement>(root,'[data-role="add-more"]'),clear=q<HTMLButtonElement>(root,'[data-role="clear-all"]'),canvas=q<HTMLCanvasElement>(root,'[data-role="preview-canvas"]');
  const kindButtons=[...root.querySelectorAll<HTMLButtonElement>('[data-watermark-kind]')],textControls=q<HTMLElement>(root,'[data-role="text-controls"]'),logoControls=q<HTMLElement>(root,'[data-role="logo-controls"]');
  const textInput=q<HTMLInputElement>(root,'[data-role="watermark-text"]'),color=q<HTMLInputElement>(root,'[data-role="watermark-color"]'),bold=q<HTMLInputElement>(root,'[data-role="watermark-bold"]'),textSize=q<HTMLInputElement>(root,'[data-role="text-size"]'),textSizeOutput=q<HTMLOutputElement>(root,'[data-role="text-size-output"]');
  const logoInput=q<HTMLInputElement>(root,'[data-role="logo-input"]'),logoName=q<HTMLElement>(root,'[data-role="logo-name"]'),logoSize=q<HTMLInputElement>(root,'[data-role="logo-size"]'),logoSizeOutput=q<HTMLOutputElement>(root,'[data-role="logo-size-output"]');
  const opacity=q<HTMLInputElement>(root,'[data-role="watermark-opacity"]'),opacityOutput=q<HTMLOutputElement>(root,'[data-role="opacity-output"]');
  const process=q<HTMLButtonElement>(root,'[data-role="process-batch"]'),download=q<HTMLButtonElement>(root,'[data-role="download-batch"]'),cancel=q<HTMLButtonElement>(root,'[data-role="cancel-batch"]'),ready=q<HTMLElement>(root,'[data-role="ready-count"]'),resultSummary=q<HTMLElement>(root,'[data-role="batch-result-summary"]');
  const progress=q<HTMLElement>(root,'[data-role="batch-progress"]'),progressText=q<HTMLElement>(root,'[data-role="progress-text"]'),progressBar=q<HTMLProgressElement>(root,'[data-role="progress-bar"]');
  const maxFiles=Number(root.dataset.maxFiles||50),maxFile=Number(root.dataset.maxFileBytes||10*1024*1024),maxPixels=Number(root.dataset.maxPixels||20_000_000),maxDimension=Number(root.dataset.maxDimension||12_000),maxTotal=200*1024*1024;
  const items:Item[]=[];let activeId:string|undefined;let generation=0;let dragging=false;
  const state:WatermarkState={kind:'text',text:textInput.value||'ConvertAnyFile',color:color.value||'#ffffff',bold:bold.checked,textScale:Number(textSize.value)/100,logoScale:Number(logoSize.value)/100,opacity:Number(opacity.value)/100,x:.82,y:.86};

  const active=()=>items.find(item=>item.id===activeId);
  const hideNotice=()=>{notice.hidden=true;notice.textContent='';delete notice.dataset.type;};
  const showNotice=(message:string,type='info')=>{notice.hidden=false;notice.dataset.type=type;notice.textContent=message;};
  const invalidate=()=>{generation++;items.forEach(item=>{item.output=undefined;});download.disabled=true;resultSummary.textContent='Preview your watermark, then apply it to all images.';};

  async function renderPreview():Promise<void>{
    const item=active();if(!item){canvas.width=1;canvas.height=1;activeName.textContent='Select an image';return;}
    activeName.textContent=item.file.name;
    const token=generation;const image=await loadImage(item.url);if(token!==generation&&activeId!==item.id)return;
    const fitted=fitSize(image.naturalWidth,image.naturalHeight,1000);canvas.width=fitted.width;canvas.height=fitted.height;
    const ctx=canvas.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);drawWatermark(ctx,canvas.width,canvas.height,state);
  }

  function syncControls():void{
    kindButtons.forEach(button=>{const selected=button.dataset.watermarkKind===state.kind;button.classList.toggle('is-active',selected);button.setAttribute('aria-pressed',String(selected));});
    textControls.hidden=state.kind!=='text';logoControls.hidden=state.kind!=='logo';
    textSizeOutput.textContent=`${Math.round(state.textScale*100)}%`;logoSizeOutput.textContent=`${Math.round(state.logoScale*100)}%`;opacityOutput.textContent=`${Math.round(state.opacity*100)}%`;
    process.disabled=!items.length||(state.kind==='logo'&&!state.logoImage);
  }

  function renderList():void{
    list.replaceChildren();count.textContent=String(items.length);ready.textContent=`${items.length} image${items.length===1?'':'s'} ready`;root.dataset.hasItems=String(items.length>0);editor.hidden=!items.length;
    items.forEach(item=>{const card=document.createElement('div');card.className=`watermark-card${item.id===activeId?' is-active':''}`;card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',`Preview ${item.file.name}`);
      const img=document.createElement('img');img.src=item.url;img.alt='';const copy=document.createElement('div');copy.className='watermark-card__copy';const name=document.createElement('strong');name.textContent=item.file.name;const meta=document.createElement('small');meta.textContent=`${item.width}×${item.height}`;copy.append(name,meta);
      const remove=document.createElement('button');remove.type='button';remove.className='watermark-remove';remove.textContent='×';remove.title='Remove image';remove.addEventListener('click',event=>{event.stopPropagation();removeItem(item.id);});
      const select=()=>{activeId=item.id;renderList();void renderPreview();};card.addEventListener('click',select);card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}});card.append(img,copy,remove);list.append(card);
    });syncControls();
  }

  async function addFiles(files:readonly File[]):Promise<void>{
    if(!files.length)return;hideNotice();let bytes=items.reduce((sum,item)=>sum+item.file.size,0),skipped=0;
    for(const file of files){if(items.length>=maxFiles||bytes+file.size>maxTotal||file.size>maxFile||!supported.has(ext(file.name))){skipped++;continue;}
      const url=URL.createObjectURL(file);
      try{const image=await loadImage(url);const width=image.naturalWidth,height=image.naturalHeight;if(width>maxDimension||height>maxDimension||width*height>maxPixels)throw new Error('limit');items.push({id:crypto.randomUUID(),file,url,width,height});bytes+=file.size;}catch{URL.revokeObjectURL(url);skipped++;}
    }
    input.value='';if(!activeId&&items[0])activeId=items[0].id;invalidate();renderList();await renderPreview();if(skipped)showNotice(`${skipped} file${skipped===1?'':'s'} skipped by format, size, dimension, or batch limits.`);
  }

  function removeItem(id:string):void{const index=items.findIndex(item=>item.id===id);if(index<0)return;const [item]=items.splice(index,1);if(item)URL.revokeObjectURL(item.url);if(activeId===id)activeId=items[Math.min(index,items.length-1)]?.id;invalidate();renderList();void renderPreview();}
  function clearAll():void{items.forEach(item=>URL.revokeObjectURL(item.url));items.splice(0);activeId=undefined;invalidate();hideNotice();renderList();void renderPreview();}

  async function setLogo(file?:File):Promise<void>{
    if(state.logoUrl){URL.revokeObjectURL(state.logoUrl);state.logoUrl=undefined;}state.logoFile=undefined;state.logoImage=undefined;logoName.textContent='Choose a PNG, JPG or WebP logo';
    if(!file){syncControls();void renderPreview();return;}
    if(file.size>maxFile||!supported.has(ext(file.name))){showNotice('Logo must be a PNG, JPG or WebP image within the file-size limit.','error');logoInput.value='';syncControls();return;}
    const url=URL.createObjectURL(file);try{const image=await loadImage(url);state.logoFile=file;state.logoUrl=url;state.logoImage=image;logoName.textContent=file.name;hideNotice();invalidate();syncControls();await renderPreview();}catch{URL.revokeObjectURL(url);showNotice('Unable to decode that logo image.','error');}
  }

  async function processBatch():Promise<void>{
    if(!items.length||(state.kind==='logo'&&!state.logoImage))return;const token=++generation;process.disabled=true;cancel.hidden=false;progress.hidden=false;progressBar.max=items.length;progressBar.value=0;download.disabled=true;
    let completed=0;
    for(const item of items){if(token!==generation)break;progressText.textContent=`Processing ${completed+1} of ${items.length}…`;
      try{const image=await loadImage(item.url);const out=document.createElement('canvas');out.width=image.naturalWidth;out.height=image.naturalHeight;const ctx=out.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');ctx.drawImage(image,0,0);drawWatermark(ctx,out.width,out.height,state);item.output=await canvasBlob(out,outputMime(item.file),.92);completed++;progressBar.value=completed;}catch{item.output=undefined;}
    }
    cancel.hidden=true;progress.hidden=true;process.disabled=false;const success=items.filter(item=>item.output).length;download.disabled=!success;download.textContent=success>1?'Download ZIP':'Download image';resultSummary.textContent=success===items.length?`${success} watermarked image${success===1?'':'s'} ready to download.`:`${success} of ${items.length} images completed.`;syncControls();
  }

  async function downloadBatch():Promise<void>{const files=items.filter(item=>item.output).map(item=>({filename:`${stem(item.file.name)}-watermarked.${outputExt(item.file)}`,blob:item.output!}));if(!files.length)return;if(files.length===1){downloadBlob(files[0]!.blob,files[0]!.filename);return;}downloadBlob(await createZipBlob(files),'watermarked-images.zip');}

  function updatePosition(event:PointerEvent):void{const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;state.x=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));state.y=Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height));invalidate();void renderPreview();}
  canvas.addEventListener('pointerdown',event=>{if(!items.length)return;dragging=true;canvas.classList.add('is-dragging');canvas.setPointerCapture(event.pointerId);updatePosition(event);});
  canvas.addEventListener('pointermove',event=>{if(dragging)updatePosition(event);});canvas.addEventListener('pointerup',event=>{dragging=false;canvas.classList.remove('is-dragging');if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);});canvas.addEventListener('pointercancel',()=>{dragging=false;canvas.classList.remove('is-dragging');});

  kindButtons.forEach(button=>button.addEventListener('click',()=>{const kind=button.dataset.watermarkKind;if(kind!=='text'&&kind!=='logo')return;state.kind=kind;invalidate();syncControls();void renderPreview();}));
  textInput.addEventListener('input',()=>{state.text=textInput.value;invalidate();void renderPreview();});color.addEventListener('input',()=>{state.color=color.value;invalidate();void renderPreview();});bold.addEventListener('change',()=>{state.bold=bold.checked;invalidate();void renderPreview();});textSize.addEventListener('input',()=>{state.textScale=Number(textSize.value)/100;invalidate();syncControls();void renderPreview();});logoSize.addEventListener('input',()=>{state.logoScale=Number(logoSize.value)/100;invalidate();syncControls();void renderPreview();});opacity.addEventListener('input',()=>{state.opacity=Number(opacity.value)/100;invalidate();syncControls();void renderPreview();});logoInput.addEventListener('change',()=>void setLogo(logoInput.files?.[0]));
  drop.addEventListener('dragover',event=>{event.preventDefault();drop.classList.add('is-dragging');});drop.addEventListener('dragleave',()=>drop.classList.remove('is-dragging'));drop.addEventListener('drop',event=>{event.preventDefault();drop.classList.remove('is-dragging');void addFiles([...event.dataTransfer!.files]);});input.addEventListener('change',()=>void addFiles([...input.files??[]]));add.addEventListener('click',()=>input.click());clear.addEventListener('click',clearAll);process.addEventListener('click',()=>void processBatch());cancel.addEventListener('click',()=>{generation++;cancel.hidden=true;progress.hidden=true;process.disabled=false;resultSummary.textContent='Processing cancelled. Change settings or apply the watermark again.';syncControls();});download.addEventListener('click',()=>void downloadBatch());
  window.addEventListener('pagehide',()=>{items.forEach(item=>URL.revokeObjectURL(item.url));if(state.logoUrl)URL.revokeObjectURL(state.logoUrl);},{once:true});
  renderList();void renderPreview();
}
