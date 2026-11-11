import { downloadBlob, createZipBlob } from '../core/download';
import { createImageFileAdmission, imageDimensionsWithinLimits } from '../core/file-admission';
import {
  sniffFileMime, imageMimeFromHeader, makePreviewCanvas, outputCanvas, pngBlob,
  sampleColor, extractPalette, formatImageDetails, encodeBase64, decodeBase64Image,
  makeFavicon, createAppIcons, makeContactSheet, mergeImages, trimTransparentBorders,
  type LoadedImage,
} from './operations';
import { parseExifBytes } from './exif';

type Entry = LoadedImage & {file:File};
type Output = {filename:string;blob:Blob;summary:string;preview:boolean};

const q=<T extends Element>(root:ParentNode,selector:string):T=>{
  const node=root.querySelector<T>(selector);
  if(!node)throw new Error('Image utility is missing '+selector);
  return node;
};
const LABELS:Readonly<Record<string,string>>={
  'image-to-base64':'Base64 data URL', 'base64-to-image':'Decoded image',
  'image-color-picker':'Selected pixel', 'color-palette-extractor':'Dominant color palette',
  'image-dimension-inspector':'Image information', 'exif-metadata-viewer':'Metadata details',
  'image-to-favicon':'favicon.ico','app-icon-generator':'App icons ZIP',
  'contact-sheet-maker':'Contact sheet PNG','merge-images-horizontally':'Horizontally merged PNG',
  'merge-images-vertically':'Vertically merged PNG',
  'trim-transparent-borders':'Trimmed image PNG',
};
export function mountImageUtility(root:HTMLElement):void {
  const id=root.dataset.toolId||'';
  if(!(id in LABELS))throw new Error('Unregistered image utility: '+id);
  root.dataset.platformRuntime='batch-v1';
  const input=root.querySelector<HTMLInputElement>('[data-role="file-input"]');
  const drop=root.querySelector<HTMLElement>('[data-role="batch-dropzone"]');
  const encodedInput=root.querySelector<HTMLTextAreaElement>('[data-role="base64-input"]');
  const countDisplay=root.querySelector<HTMLElement>('[data-role="batch-count"]');
  const queue=q<HTMLElement>(root,'[data-role="file-list"]');
  const list=q<HTMLElement>(root,'[data-role="file-items"]');
  const add=q<HTMLButtonElement>(root,'[data-role="utility-add"]');
  const clear=q<HTMLButtonElement>(root,'[data-role="utility-clear"]');
  const run=q<HTMLButtonElement>(root,'[data-role="process-batch"]');
  const download=q<HTMLButtonElement>(root,'[data-role="download-batch"]');
  const copy=q<HTMLButtonElement>(root,'[data-role="copy-output"]');
  const notice=q<HTMLElement>(root,'[data-role="notice"]');
  const status=q<HTMLElement>(root,'[data-role="status"]');
  const text=q<HTMLTextAreaElement>(root,'[data-role="text-result"]');
  const sourceCanvas=q<HTMLCanvasElement>(root,'[data-role="source-canvas"]');
  const sourceEmpty=q<HTMLElement>(root,'[data-role="empty-image"]');
  const imageInfo=q<HTMLElement>(root,'[data-role="image-info"]');
  const resultView=q<HTMLElement>(root,'[data-role="result-view"]');
  const resultImage=q<HTMLImageElement>(root,'[data-role="result-image"]');
  const resultInfo=q<HTMLElement>(root,'[data-role="result-image-info"]');
  const swatches=q<HTMLElement>(root,'[data-role="palette"]');
  const progress=q<HTMLElement>(root,'[data-role="utility-progress"]');
  const progressBar=q<HTMLProgressElement>(root,'[data-role="progress-bar"]');
  const progressText=q<HTMLElement>(root,'[data-role="progress-text"]');
  const cols=root.querySelector<HTMLSelectElement>('[data-role="contact-columns"]');
  const maxFiles=Number(root.dataset.maxFiles||1);
  const maxFileBytes=Number(root.dataset.maxFileBytes||10485760);
  const maxPixels=Number(root.dataset.maxPixels||20_000_000);
  const maxDimension=Number(root.dataset.maxDimension||12_000);
  const policy={
    maxFiles,maxFileBytes,maxTotalBytes:maxFiles===1?maxFileBytes:50*1048576,
    acceptedExtensions:['jpg','jpeg','png','webp'],
  };
  let images:Entry[]=[];
  let activeIndex=0;
  let lastOutput:Output|undefined;
  let objectUrl:string|undefined;
  let working=false;

  const showNotice=(message:string,isError=true)=>{
    notice.textContent=message;notice.hidden=false;notice.dataset.type=isError?'error':'info';
    status.textContent=message;
  };
  const clearNotice=()=>{notice.hidden=true;notice.textContent='';delete notice.dataset.type;};
  const clearOutput=()=>{
    lastOutput=undefined;
    text.value='';
    swatches.hidden=true;swatches.replaceChildren();
    copy.disabled=true;download.disabled=true;
    resultView.hidden=true;resultImage.hidden=true;resultImage.removeAttribute('src');
    resultInfo.textContent='';
    if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=undefined;}
  };
  const updateResult=(out:Output)=>{
    lastOutput=out;
    download.disabled=false;
    download.textContent='Download '+out.filename;
    if(out.summary){text.value=out.summary;copy.disabled=false;}
    if(out.preview&&out.blob.type.startsWith('image/')){
      objectUrl=URL.createObjectURL(out.blob);
      resultImage.src=objectUrl;resultImage.hidden=false;
      resultView.hidden=false;resultInfo.textContent=out.filename+' · '+out.blob.size.toLocaleString('en-US')+' bytes';
    }
    status.textContent=LABELS[id]+' is ready to download.';
  };
  const textOnly=(value:string,filename:string)=>{
    updateResult({filename,blob:new Blob([value],{type:'text/plain;charset=utf-8'}),summary:value,preview:false});
  };
  const active=():Entry|undefined=>images[activeIndex]??images[0];
  const renderPreview=()=>{
    const image=active();
    if(!image){
      sourceCanvas.hidden=true;sourceEmpty.hidden=false;imageInfo.textContent='No image selected';
      sourceCanvas.width=1;sourceCanvas.height=1;
      return;
    }
    const drawn=makePreviewCanvas(image.bitmap,620,400);
    sourceCanvas.width=drawn.width;sourceCanvas.height=drawn.height;
    const ctx=sourceCanvas.getContext('2d');
    if(!ctx)throw new Error('Canvas rendering is unavailable.');
    ctx.drawImage(drawn,0,0);
    sourceCanvas.hidden=false;sourceEmpty.hidden=true;
    imageInfo.textContent=image.width+' × '+image.height+' · '+image.name;
  };
  const renderQueue=()=>{
    queue.hidden=images.length===0;
    root.dataset.hasItems=images.length?'true':'false';
    list.replaceChildren();
    images.forEach((image,index)=>{
      const item=document.createElement('div');
      item.className='image-utility-file-item';
      const title=document.createElement('span');
      title.textContent=(index+1)+'. '+image.name+' ('+image.width+'×'+image.height+')';
      const view=document.createElement('button');
      view.type='button';view.textContent='View';
      view.setAttribute('aria-label','View '+image.name);
      view.addEventListener('click',()=>{if(working)return;activeIndex=index;renderPreview();});
      const remove=document.createElement('button');
      remove.type='button';remove.textContent='×';remove.title='Remove '+image.name;
      remove.setAttribute('aria-label','Remove '+image.name);
      remove.addEventListener('click',()=>{
        if(working)return;
        image.bitmap.close();
        images.splice(index,1);
        if(activeIndex>=images.length)activeIndex=Math.max(0,images.length-1);
        clearOutput();clearNotice();renderQueue();renderPreview();
      });
      item.append(title,view,remove);list.append(item);
    });
    add.hidden=images.length>=maxFiles||id==='base64-to-image';
    if(countDisplay)countDisplay.textContent=String(images.length);
  };
  const releaseImages=()=>{
    for(const image of images)image.bitmap.close();
    images=[];activeIndex=0;renderQueue();renderPreview();
  };
  clear.addEventListener('click',()=>{
    if(working)return;
    releaseImages();clearOutput();clearNotice();
    status.textContent='Cleared. Select an image to begin.';
  });
  add.addEventListener('click',()=>input?.click());

  async function addFiles(files:FileList|readonly File[]):Promise<void>{
    if(working)return;
    const admission=createImageFileAdmission(images,policy);
    let admitted=0;
    const errors:string[]=[];
    for(const file of Array.from(files)) {
      const reason=admission.check(file);
      if(reason){errors.push(file.name+': '+reason);continue;}
      let bitmap:ImageBitmap|undefined;
      try{
        const mime=await sniffFileMime(file);
        bitmap=await createImageBitmap(file);
        if(!imageDimensionsWithinLimits(bitmap.width,bitmap.height,{maxPixels,maxDimension}))
          throw new Error('Image dimensions exceed the pixel or side safety limit.');
        admission.accept(file);
        images.push({file,name:file.name,mime,bitmap,width:bitmap.width,height:bitmap.height});
        admitted++;
      }catch(error){
        bitmap?.close();
        errors.push(file.name+': '+(error instanceof Error?error.message:'Unable to decode image.'));
      }
    }
    if(admitted){
      clearOutput();
      activeIndex=images.length-admitted;
      renderQueue();renderPreview();
      status.textContent=images.length+' image(s) selected.';
    }
    if(errors.length)showNotice(errors.slice(0,3).join(' | ')+(errors.length>3?' | More files rejected.':''));
    else if(admitted)clearNotice();
  }
  input?.addEventListener('change',()=>{
    const chosen=Array.from(input.files??[]);
    input.value='';
    void addFiles(chosen);
  });
  if(drop){
    drop.addEventListener('dragover',(event)=>{event.preventDefault();drop.classList.add('is-dragging');});
    drop.addEventListener('dragleave',()=>drop.classList.remove('is-dragging'));
    drop.addEventListener('drop',(event)=>{
      event.preventDefault();drop.classList.remove('is-dragging');
      if(event.dataTransfer?.files)void addFiles(Array.from(event.dataTransfer.files));
    });
  }
  sourceCanvas.addEventListener('click',(event)=>{
    if(id!=='image-color-picker'||working)return;
    const image=active();if(!image)return;
    const bounds=sourceCanvas.getBoundingClientRect();
    if(!bounds.width||!bounds.height)return;
    const sx=((event.clientX-bounds.left)/bounds.width)*image.width;
    const sy=((event.clientY-bounds.top)/bounds.height)*image.height;
    clearOutput();
    textOnly(sampleColor(image,sx,sy),'selected-image-color.txt');
  });
  encodedInput?.addEventListener('input',()=>{clearOutput();clearNotice();});

  const setWorking=(next:boolean)=>{
    working=next;run.disabled=next;
    clear.disabled=next;add.disabled=next;
    if(input)input.disabled=next;
    if(encodedInput)encodedInput.disabled=next;
    if(cols)cols.disabled=next;
    if(next){progress.hidden=false;progressBar.value=0;progressText.textContent='Processing locally…';}
    else progress.hidden=true;
  };
  run.addEventListener('click',async()=>{
    if(working)return;
    clearOutput();clearNotice();
    const image=active();
    if(id!=='base64-to-image'&&!image){showNotice('Select an image before running this tool.');return;}
    if((id==='merge-images-horizontally'||id==='merge-images-vertically')&&images.length<2){
      showNotice('Choose at least two images to merge.');return;
    }
    setWorking(true);
    try{
      switch(id){
        case 'image-to-base64':{
          const bytes=new Uint8Array(await image!.file.arrayBuffer());
          const value='data:'+image!.mime+';base64,'+encodeBase64(bytes);
          textOnly(value,'image-base64.txt');
          break;
        }
        case 'base64-to-image':{
          const inputText=encodedInput?.value||'';
          const decoded=decodeBase64Image(inputText);
          // Copy into an ArrayBuffer-backed view for BlobPart compatibility.
          const copy=new Uint8Array(decoded.bytes.byteLength);
          copy.set(decoded.bytes);
          const blob=new Blob([copy],{type:decoded.mime});
          const bitmap=await createImageBitmap(blob);
          const name=decoded.mime==='image/png'?'decoded-image.png':decoded.mime==='image/jpeg'?'decoded-image.jpg':'decoded-image.webp';
          try{
            if(!imageDimensionsWithinLimits(bitmap.width,bitmap.height,{maxPixels,maxDimension}))
              throw new Error('Decoded image exceeds the dimension or pixel limit.');
            updateResult({filename:name,blob,preview:true,
              summary:'Decoded image: '+name+'\nDimensions: '+bitmap.width+' × '+bitmap.height+'\nSize: '+blob.size+' bytes'});
          }finally{bitmap.close();}
          break;
        }
        case 'image-color-picker':{
          textOnly(sampleColor(image!,image!.width/2,image!.height/2),'selected-image-color.txt');
          break;
        }
        case 'color-palette-extractor':{
          const colors=extractPalette(image!.bitmap);
          if(!colors.length)throw new Error('No opaque pixels are available for palette extraction.');
          swatches.replaceChildren();
          for(const color of colors){
            const chip=document.createElement('button');chip.type='button';
            const swatch=document.createElement('span');swatch.style.backgroundColor=color;
            const label=document.createElement('strong');label.textContent=color;
            chip.append(swatch,label);
            chip.title='Copy '+color;
            chip.addEventListener('click',()=>{void navigator.clipboard.writeText(color).then(()=>status.textContent='Copied '+color).catch(()=>status.textContent='Copy failed.');});
            swatches.append(chip);
          }
          swatches.hidden=false;
          textOnly(colors.join('\n'),'image-palette.txt');
          break;
        }
        case 'image-dimension-inspector':{
          textOnly(formatImageDetails(image!,image!.file.size),'image-dimensions.txt');
          break;
        }
        case 'exif-metadata-viewer':{
          const bytes=new Uint8Array(await image!.file.arrayBuffer());
          textOnly(parseExifBytes(bytes),'image-exif-metadata.txt');
          break;
        }
        case 'image-to-favicon':{
          const blob=await makeFavicon(image!.bitmap);
          updateResult({filename:'favicon.ico',blob,preview:false,
            summary:'favicon.ico created with embedded 16×16, 32×32 and 48×48 PNG icon entries.\nFile size: '+blob.size+' bytes'});
          break;
        }
        case 'app-icon-generator':{
          const files=await createAppIcons(image!.bitmap);
          const blob=await createZipBlob(files);
          updateResult({filename:'app-icons.zip',blob,preview:false,summary:files.map(item=>item.filename).join('\n')});
          break;
        }
        case 'contact-sheet-maker':{
          const columns=Number(cols?.value||3);
          const canvas=await makeContactSheet(images,columns);
          const blob=await pngBlob(canvas);
          updateResult({filename:'contact-sheet.png',blob,preview:true,
            summary:'Contact sheet: '+images.length+' image(s)\nCanvas: '+canvas.width+' × '+canvas.height+' pixels'});
          break;
        }
        case 'merge-images-horizontally':
        case 'merge-images-vertically':{
          const horizontal=id==='merge-images-horizontally';
          const canvas=mergeImages(images,horizontal?'horizontal':'vertical');
          const blob=await pngBlob(canvas);
          updateResult({filename:horizontal?'images-horizontal.png':'images-vertical.png',blob,preview:true,
            summary:'Merged '+images.length+' images\nOutput: '+canvas.width+' × '+canvas.height+' pixels'});
          break;
        }
        case 'trim-transparent-borders':{
          const canvas=trimTransparentBorders(image!);
          const blob=await pngBlob(canvas);
          updateResult({filename:'trimmed-image.png',blob,preview:true,
            summary:'Source: '+image!.width+' × '+image!.height+'\nTrimmed: '+canvas.width+' × '+canvas.height+' pixels'});
          break;
        }
      }
      progressBar.value=1;
    }catch(error){
      clearOutput();
      showNotice(error instanceof Error?error.message:'Could not process this image.');
    }finally{setWorking(false);}
  });

  download.addEventListener('click',()=>{
    if(lastOutput)downloadBlob(lastOutput.blob,lastOutput.filename);
  });
  copy.addEventListener('click',()=>{
    if(!text.value)return;
    void navigator.clipboard.writeText(text.value).then(()=>status.textContent='Copied text to clipboard.').catch(()=>status.textContent='Copy unavailable; select the text and copy manually.');
  });
  window.addEventListener('pagehide',()=>{
    for(const image of images)image.bitmap.close();
    if(objectUrl)URL.revokeObjectURL(objectUrl);
  },{once:true});
  renderQueue();renderPreview();
  status.textContent=id==='base64-to-image'?'Paste Base64 text and click Decode.':'Select image files to begin.';
}
