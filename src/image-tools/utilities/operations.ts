export type SupportedImageMime = 'image/png'|'image/jpeg'|'image/webp';
export interface LoadedImage {
  name:string;
  mime:SupportedImageMime;
  width:number;
  height:number;
  bitmap:ImageBitmap;
}
export const MAX_OUTPUT_PIXELS=20_000_000;
export const MAX_OUTPUT_DIMENSION=12_000;

export function imageMimeFromHeader(bytes:Uint8Array):SupportedImageMime|undefined {
  if(bytes.length>=8&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10)return'image/png';
  if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return'image/jpeg';
  if(bytes.length>=12&&String.fromCharCode(...bytes.subarray(0,4))==='RIFF'&&String.fromCharCode(...bytes.subarray(8,12))==='WEBP')return'image/webp';
  return undefined;
}
export async function sniffFileMime(file:File):Promise<SupportedImageMime> {
  const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());
  const mime=imageMimeFromHeader(bytes);
  if(!mime)throw new Error('Unsupported image bytes. Choose a valid JPG, PNG or WebP file.');
  const ext=file.name.split('.').pop()?.toLowerCase();
  const expected=ext==='png'?'image/png':ext==='jpg'||ext==='jpeg'?'image/jpeg':ext==='webp'?'image/webp':undefined;
  if(expected!==mime)throw new Error('The file extension does not match its actual JPG, PNG or WebP bytes.');
  return mime;
}
export function outputCanvas(width:number,height:number):HTMLCanvasElement {
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||
     width>MAX_OUTPUT_DIMENSION||height>MAX_OUTPUT_DIMENSION||width*height>MAX_OUTPUT_PIXELS)
    throw new Error('Output would exceed the 12,000px dimension or 20-million-pixel safety limit.');
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  return canvas;
}
function canvasContext(canvas:HTMLCanvasElement):CanvasRenderingContext2D {
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw new Error('Canvas 2D is unavailable in this browser.');
  return ctx;
}
export function makePreviewCanvas(bitmap:ImageBitmap,maxWidth=700,maxHeight=480):HTMLCanvasElement {
  const factor=Math.min(1,maxWidth/bitmap.width,maxHeight/bitmap.height);
  const canvas=outputCanvas(Math.max(1,Math.round(bitmap.width*factor)),Math.max(1,Math.round(bitmap.height*factor)));
  canvasContext(canvas).drawImage(bitmap,0,0,canvas.width,canvas.height);
  return canvas;
}
export async function pngBlob(canvas:HTMLCanvasElement):Promise<Blob> {
  return new Promise((resolve,reject)=>{
    canvas.toBlob((blob)=>blob?resolve(blob):reject(new Error('PNG encoding failed.')),'image/png');
  });
}
function fitBitmap(ctx:CanvasRenderingContext2D,bitmap:ImageBitmap,x:number,y:number,w:number,h:number):void {
  const scale=Math.min(w/bitmap.width,h/bitmap.height);
  const dw=Math.max(1,bitmap.width*scale),dh=Math.max(1,bitmap.height*scale);
  ctx.drawImage(bitmap,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
}
export function sampleColor(image:LoadedImage,x:number,y:number):string {
  const px=Math.max(0,Math.min(image.width-1,Math.floor(x)));
  const py=Math.max(0,Math.min(image.height-1,Math.floor(y)));
  const c=outputCanvas(1,1),ctx=canvasContext(c);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(image.bitmap,px,py,1,1,0,0,1,1);
  const data=ctx.getImageData(0,0,1,1).data;
  const [r,g,b,a]=Array.from(data);
  const hex='#'+[r,g,b].map(v=>v!.toString(16).padStart(2,'0')).join('').toUpperCase();
  return ['HEX: '+hex,'RGBA: rgba('+r+', '+g+', '+b+', '+(a!/255).toFixed(3)+')','Source pixel: ('+px+', '+py+')'].join('\n');
}
export function extractPalette(bitmap:ImageBitmap,maxColors=6):string[] {
  const sample=makePreviewCanvas(bitmap,120,120);
  const ctx=canvasContext(sample),rgba=ctx.getImageData(0,0,sample.width,sample.height).data;
  type Bucket={count:number;r:number;g:number;b:number};
  const buckets=new Map<number,Bucket>();
  for(let p=0;p<rgba.length;p+=4) {
    if(rgba[p+3]!<64)continue;
    const r=rgba[p]!,g=rgba[p+1]!,b=rgba[p+2]!;
    const key=((r>>5)<<6)|((g>>5)<<3)|(b>>5);
    const row=buckets.get(key)??{count:0,r:0,g:0,b:0};
    row.count++;row.r+=r;row.g+=g;row.b+=b;buckets.set(key,row);
  }
  const sorted=[...buckets.values()].sort((a,b)=>b.count-a.count);
  const chosen:{r:number;g:number;b:number}[]=[];
  for(const bucket of sorted) {
    const rgb={r:Math.round(bucket.r/bucket.count),g:Math.round(bucket.g/bucket.count),b:Math.round(bucket.b/bucket.count)};
    if(chosen.some(c=>Math.hypot(c.r-rgb.r,c.g-rgb.g,c.b-rgb.b)<34))continue;
    chosen.push(rgb);
    if(chosen.length>=maxColors)break;
  }
  return chosen.map(({r,g,b})=>'#'+[r,g,b].map(value=>value.toString(16).padStart(2,'0')).join('').toUpperCase());
}
export function formatImageDetails(image:LoadedImage,fileSize:number):string {
  const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
  const divisor=gcd(image.width,image.height);
  const format=image.mime==='image/jpeg'?'JPEG':image.mime==='image/png'?'PNG':'WebP';
  return ['Name: '+image.name,'Format: '+format,
    'Dimensions: '+image.width+' × '+image.height+' pixels',
    'Aspect ratio: '+(image.width/divisor)+':'+(image.height/divisor),
    'Total pixels: '+(image.width*image.height).toLocaleString('en-US'),
    'File size: '+fileSize.toLocaleString('en-US')+' bytes ('+(fileSize/1048576).toFixed(2)+' MiB)'].join('\n');
}
export function encodeBase64(bytes:Uint8Array):string {
  let binary='';
  for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
  return btoa(binary);
}
export function decodeBase64Image(input:string,maxBytes=10*1024*1024):{bytes:Uint8Array;mime:SupportedImageMime} {
  const raw=input.trim();
  const match=/^data:(image\/(?:png|jpeg|jpg|webp));base64,([\s\S]*)$/i.exec(raw);
  if(raw.toLowerCase().startsWith('data:')&&!match)throw new Error('Only Base64 data URLs for JPG, PNG and WebP are accepted.');
  const base=(match?match[2]!:raw).replace(/\s+/g,'');
  if(!base||base.length>Math.ceil(maxBytes*4/3)+8)throw new Error('The Base64 data is empty or exceeds the 10 MB decoded limit.');
  if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base))
    throw new Error('Invalid Base64 characters or padding.');
  let binary:string;
  try{binary=atob(base);}catch{throw new Error('Invalid Base64 encoding.');}
  if(binary.length>maxBytes)throw new Error('Decoded image exceeds 10 MB.');
  const bytes=Uint8Array.from(binary,(char)=>char.charCodeAt(0));
  const mime=imageMimeFromHeader(bytes);
  if(!mime)throw new Error('The decoded bytes are not a supported PNG, JPEG or WebP image.');
  if(match){
    const declared=match[1]!.toLowerCase().replace('jpg','jpeg');
    if(declared!==mime)throw new Error('Data URL MIME type does not match the actual image bytes.');
  }
  return {bytes,mime};
}
export async function makeFavicon(bitmap:ImageBitmap):Promise<Blob> {
  const sizes=[16,32,48];
  const pngs:ArrayBuffer[]=[];
  for(const size of sizes) {
    const canvas=outputCanvas(size,size),ctx=canvasContext(canvas);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    fitBitmap(ctx,bitmap,0,0,size,size);
    pngs.push(await (await pngBlob(canvas)).arrayBuffer());
  }
  const directory=new Uint8Array(6+16*sizes.length);
  const view=new DataView(directory.buffer);
  view.setUint16(0,0,true);view.setUint16(2,1,true);view.setUint16(4,sizes.length,true);
  let offset=directory.length;
  pngs.forEach((png,index)=>{
    const p=6+index*16;directory[p]=sizes[index]!;
    directory[p+1]=sizes[index]!;directory[p+2]=0;directory[p+3]=0;
    view.setUint16(p+4,1,true);view.setUint16(p+6,32,true);
    view.setUint32(p+8,png.byteLength,true);view.setUint32(p+12,offset,true);
    offset+=png.byteLength;
  });
  return new Blob([directory.buffer,...pngs],{type:'image/x-icon'});
}
export async function createAppIcons(bitmap:ImageBitmap):Promise<{filename:string;blob:Blob}[]> {
  const sizes=[48,72,96,120,144,152,180,192,256,384,512];
  const files:{filename:string;blob:Blob}[]=[];
  for(const size of sizes) {
    const canvas=outputCanvas(size,size),ctx=canvasContext(canvas);
    ctx.imageSmoothingQuality='high';
    fitBitmap(ctx,bitmap,0,0,size,size);
    const filename=size===180?'apple-touch-icon.png':'icon-'+size+'x'+size+'.png';
    files.push({filename,blob:await pngBlob(canvas)});
  }
  const manifest={
    name:'My Web App',short_name:'My App',display:'standalone',
    icons:[192,256,384,512].map(size=>({src:'icon-'+size+'x'+size+'.png',sizes:size+'x'+size,type:'image/png',purpose:'any maskable'})),
  };
  files.push({filename:'manifest.webmanifest',blob:new Blob([JSON.stringify(manifest,null,2)],{type:'application/manifest+json'})});
  return files;
}
export async function makeContactSheet(images:readonly LoadedImage[],columns:number):Promise<HTMLCanvasElement> {
  if(!Number.isInteger(columns)||columns<2||columns>5)throw new Error('Choose between two and five columns.');
  if(!images.length||images.length>20)throw new Error('Select between 1 and 20 images.');
  const tileW=200,tileH=196,pad=12;
  const cols=Math.min(columns,images.length),rows=Math.ceil(images.length/cols);
  const canvas=outputCanvas(cols*tileW+2*pad,rows*tileH+2*pad),ctx=canvasContext(canvas);
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
  images.forEach((image,i)=>{
    const col=i%cols,row=Math.floor(i/cols),x=pad+col*tileW,y=pad+row*tileH;
    ctx.fillStyle='#f2f3f7';ctx.fillRect(x+5,y+4,tileW-10,tileH-12);
    fitBitmap(ctx,image.bitmap,x+10,y+9,tileW-20,tileH-47);
    ctx.fillStyle='#111827';ctx.font='12px system-ui, sans-serif';
    let label=image.name;
    while(label.length>2&&ctx.measureText(label).width>tileW-24)label=label.slice(0,-2)+'…';
    ctx.fillText(label,x+10,y+tileH-20);
  });
  return canvas;
}
export function mergeImages(images:readonly LoadedImage[],direction:'horizontal'|'vertical'):HTMLCanvasElement {
  if(images.length<2||images.length>20)throw new Error('Choose between 2 and 20 images to merge.');
  const width=direction==='horizontal'?images.reduce((n,image)=>n+image.width,0):Math.max(...images.map(image=>image.width));
  const height=direction==='vertical'?images.reduce((n,image)=>n+image.height,0):Math.max(...images.map(image=>image.height));
  const canvas=outputCanvas(width,height),ctx=canvasContext(canvas);
  let cursor=0;
  images.forEach(image=>{
    const x=direction==='horizontal'?cursor:Math.floor((width-image.width)/2);
    const y=direction==='vertical'?cursor:Math.floor((height-image.height)/2);
    ctx.drawImage(image.bitmap,x,y);
    cursor+=direction==='horizontal'?image.width:image.height;
  });
  return canvas;
}
export function trimTransparentBorders(image:LoadedImage):HTMLCanvasElement {
  const canvas=outputCanvas(image.width,image.height),ctx=canvasContext(canvas);
  ctx.drawImage(image.bitmap,0,0);
  const rgba=ctx.getImageData(0,0,image.width,image.height).data;
  let left=image.width,top=image.height,right=-1,bottom=-1;
  for(let y=0;y<image.height;y++){
    for(let x=0;x<image.width;x++){
      if(rgba[(y*image.width+x)*4+3]===0)continue;
      left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
    }
  }
  if(right<0)throw new Error('The image is fully transparent; there are no visible pixels to retain.');
  if(left===0&&top===0&&right===image.width-1&&bottom===image.height-1)
    throw new Error('No fully transparent outer border was found.');
  const output=outputCanvas(right-left+1,bottom-top+1);
  canvasContext(output).drawImage(canvas,left,top,output.width,output.height,0,0,output.width,output.height);
  return output;
}
