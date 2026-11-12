import {createImageFileAdmission,imageDimensionsWithinLimits} from '../core/file-admission';
import {downloadResultBatch} from '../core/download';
import {sniffFileMime,type LoadedImage} from '../utilities/operations';
import {runAdvancedImageTool,type AdvancedOutput,type AdvancedParams} from './operations';

type Entry=LoadedImage&{file:File};
const by=<T extends Element>(root:ParentNode,selector:string):T=>{
 const element=root.querySelector<T>(selector);
 if(!element)throw new Error('Missing advanced image control: '+selector);
 return element;
};

export function mountAdvancedImageTool(root:HTMLElement):void{
 root.dataset.platformRuntime='batch-v1';
 const id=root.dataset.toolId||'';
 const maxFiles=Number(root.dataset.maxFiles||1);
 const maxFileBytes=Number(root.dataset.maxFileBytes||10*1024*1024);
 const maxPixels=Number(root.dataset.maxPixels||8_000_000);
 const maxDimension=Number(root.dataset.maxDimension||8_000);
 const input=by<HTMLInputElement>(root,'[data-role="file-input"]');
 const drop=by<HTMLElement>(root,'[data-role="batch-dropzone"]');
 const clear=by<HTMLButtonElement>(root,'[data-advanced-clear]');
 const queue=by<HTMLElement>(root,'[data-advanced-queue]');
 const fileList=by<HTMLElement>(root,'[data-advanced-files]');
 const run=by<HTMLButtonElement>(root,'[data-advanced-process]');
 const download=by<HTMLButtonElement>(root,'[data-advanced-download]');
 const notice=by<HTMLElement>(root,'[data-role="notice"]');
 const status=by<HTMLElement>(root,'[data-advanced-status]');
 const original=by<HTMLImageElement>(root,'[data-advanced-original]');
 const preview=by<HTMLImageElement>(root,'[data-advanced-preview]');
 const inputSize=by<HTMLElement>(root,'[data-advanced-input-size]');
 const outputSize=by<HTMLElement>(root,'[data-advanced-output-size]');
 const sourceEmpty=by<HTMLElement>(root,'[data-advanced-empty]');
 const previewEmpty=by<HTMLElement>(root,'[data-advanced-preview-empty]');
 const results=by<HTMLElement>(root,'[data-advanced-results]');
 const resultCount=by<HTMLElement>(root,'[data-advanced-results-count]');
 const resultList=by<HTMLElement>(root,'[data-advanced-output-list]');
 const params=Array.from(root.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-advanced-param]'));
 let images:Entry[]=[];
 let activeIndex=0;
 let outputs:AdvancedOutput[]=[];
 let sourceUrl:string|undefined,previewUrl:string|undefined;
 let working=false;

 const revokeSource=()=>{
  if(sourceUrl){URL.revokeObjectURL(sourceUrl);sourceUrl=undefined;}
  original.removeAttribute('src');
 };
 const clearOutput=()=>{
  outputs=[];download.disabled=true;results.hidden=true;
  resultList.textContent='';resultCount.textContent='';
  preview.hidden=true;previewEmpty.hidden=false;outputSize.textContent='Not generated';
  preview.removeAttribute('src');
  if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=undefined;}
 };
 const error=(message:string)=>{
  notice.textContent=message;notice.hidden=false;
  status.textContent=message;
 };
 const clearError=()=>{notice.hidden=true;notice.textContent='';};
 const showSource=()=>{
  revokeSource();
  const active=images[activeIndex];
  if(!active){
   sourceEmpty.hidden=false;original.hidden=true;inputSize.textContent='No image selected';return;
  }
  sourceUrl=URL.createObjectURL(active.file);
  original.src=sourceUrl;original.hidden=false;sourceEmpty.hidden=true;
  inputSize.textContent=active.width+' × '+active.height+' · '+active.name;
 };
 const showFiles=()=>{
  queue.hidden=images.length===0;
  root.dataset.hasItems=images.length?'true':'false';
  run.disabled=working||images.length===0;
  fileList.replaceChildren();
  images.forEach((image,index)=>{
   const item=document.createElement('div');item.className='advanced-file';
   const label=document.createElement('span');label.textContent=(index+1)+'. '+image.name;
   const view=document.createElement('button');
   view.textContent='View';view.type='button';
   view.setAttribute('aria-label','View '+image.name);
   view.addEventListener('click',()=>{if(working)return;activeIndex=index;showSource();});
   const remove=document.createElement('button');
   remove.textContent='Remove';remove.type='button';
   remove.setAttribute('aria-label','Remove '+image.name);
   remove.addEventListener('click',()=>{
    if(working)return;
    image.bitmap.close();
    images.splice(index,1);
    activeIndex=Math.max(0,Math.min(activeIndex,images.length-1));
    clearOutput();clearError();showFiles();showSource();
   });
   item.append(label,view,remove);fileList.append(item);
  });
 };
 const resetImages=()=>{
  images.forEach(image=>image.bitmap.close());
  images=[];activeIndex=0;
  clearOutput();clearError();showFiles();showSource();
 };
 clear.addEventListener('click',()=>{
  if(working)return;
  resetImages();input.value='';status.textContent='Choose an image to start.';
 });
 const policy={
  maxFiles,maxFileBytes,maxTotalBytes:maxFiles===1?maxFileBytes:60*1024*1024,
  acceptedExtensions:['jpg','jpeg','png','webp'],
 };
 async function addFiles(files:readonly File[]):Promise<void>{
  if(working)return;
  const admission=createImageFileAdmission(images,policy);
  const failures:string[]=[];
  let added=0;
  for(const file of files){
   const rejected=admission.check(file);
   if(rejected){failures.push(file.name+': '+rejected);continue;}
   let bitmap:ImageBitmap|undefined;
   try{
    const mime=await sniffFileMime(file);
    bitmap=await createImageBitmap(file);
    if(!imageDimensionsWithinLimits(bitmap.width,bitmap.height,{maxPixels,maxDimension}))
     throw new Error('Image dimension or pixel safety limit exceeded.');
    admission.accept(file);
    images.push({file,name:file.name,mime,width:bitmap.width,height:bitmap.height,bitmap});
    added++;
   }catch(e){
    bitmap?.close();
    failures.push(file.name+': '+(e instanceof Error?e.message:'Unable to decode image'));
   }
  }
  if(added){
   clearOutput();clearError();
   activeIndex=images.length-added;showFiles();showSource();
   status.textContent=images.length+' image(s) ready to process.';
  }
  if(failures.length)error(failures.slice(0,3).join(' | ')+(failures.length>3?' | More rejected files.':''));
 }
 input.addEventListener('change',()=>{
  const files=Array.from(input.files??[]);
  input.value='';
  void addFiles(files);
 });
 drop.addEventListener('dragover',event=>{event.preventDefault();drop.classList.add('is-dragging');});
 drop.addEventListener('dragleave',()=>drop.classList.remove('is-dragging'));
 drop.addEventListener('drop',event=>{
  event.preventDefault();drop.classList.remove('is-dragging');
  const files=Array.from(event.dataTransfer?.files??[]);
  void addFiles(files);
 });
 for(const param of params)param.addEventListener(param instanceof HTMLSelectElement?'change':'input',()=>{
  if(working)return;
  clearOutput();clearError();status.textContent='Settings changed. Generate a new preview.';
 });
 const setWorking=(flag:boolean)=>{
  working=flag;
  run.disabled=flag||images.length===0;
  download.disabled=flag||outputs.length===0;
  input.disabled=flag;clear.disabled=flag;
  for(const param of params)param.disabled=flag;
  status.setAttribute('aria-busy',String(flag));
 };

 run.addEventListener('click',async()=>{
  if(working||!images.length)return;
  clearError();clearOutput();setWorking(true);
  status.textContent='Processing images locally…';
  try{
   const settings:Record<string,string>={};
   for(const field of params)settings[field.dataset.advancedParam||'']=field.value;
   const generated=await runAdvancedImageTool(id,images,settings as AdvancedParams);
   if(!generated.length)throw new Error('No output images were produced.');
   outputs=generated;
   resultCount.textContent=generated.length+' PNG image'+(generated.length===1?'':'s')+' ready';
   resultList.textContent=generated.length===1?generated[0]!.filename:
     'Download a ZIP containing '+generated.length+' numbered files.';
   results.hidden=false;
   const representative=generated[0]!;
   previewUrl=URL.createObjectURL(representative.blob);
   preview.src=previewUrl;preview.hidden=false;previewEmpty.hidden=true;
   const bitmap=await createImageBitmap(representative.blob);
   outputSize.textContent=bitmap.width+' × '+bitmap.height;
   bitmap.close();
   download.textContent=generated.length===1?'Download PNG':'Download ZIP ('+generated.length+')';
   status.textContent='Processed successfully. Your original image is unchanged.';
  }catch(e){
   clearOutput();
   error(e instanceof Error?e.message:'Could not process images.');
  }finally{
   setWorking(false);
  }
 });

 download.addEventListener('click',async()=>{
  if(working||!outputs.length)return;
  download.disabled=true;
  try{
   await downloadResultBatch(outputs,'advanced-'+id+'.zip');
   status.textContent=outputs.length===1?'PNG download started.':'ZIP download started.';
  }catch(e){error(e instanceof Error?e.message:'Download failed.');}
  finally{download.disabled=false;}
 });

 window.addEventListener('pagehide',()=>{
  images.forEach(image=>image.bitmap.close());
  if(sourceUrl)URL.revokeObjectURL(sourceUrl);
  if(previewUrl)URL.revokeObjectURL(previewUrl);
 },{once:true});
 showFiles();showSource();
}
