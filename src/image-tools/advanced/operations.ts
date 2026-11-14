import { outputCanvas, pngBlob, type LoadedImage } from '../utilities/operations';
import { wrapText } from './text-layout';

export type AdvancedParams = Readonly<Record<string,string>>;
export type AdvancedOutput = {filename:string;blob:Blob};
const LIMIT_TEXT=300;
const clamp=(value:number,min=0,max=255)=>Math.min(max,Math.max(min,value));
const ctx2d=(canvas:HTMLCanvasElement,read=false):CanvasRenderingContext2D=>{
 const context=canvas.getContext('2d',{willReadFrequently:read});
 if(!context)throw new Error('Canvas 2D rendering is unavailable.');
 return context;
};
const int=(settings:AdvancedParams,key:string,fallback:number,min:number,max:number):number=>{
 const value=Number(settings[key]??fallback);
 if(!Number.isInteger(value)||value<min||value>max)throw new Error(key+' must be a whole number from '+min+' to '+max+'.');
 return value;
};
const num=(settings:AdvancedParams,key:string,fallback:number,min:number,max:number):number=>{
 const value=Number(settings[key]??fallback);
 if(!Number.isFinite(value)||value<min||value>max)throw new Error(key+' must be between '+min+' and '+max+'.');
 return value;
};
const choice=(settings:AdvancedParams,key:string,fallback:string,options:readonly string[]):string=>{
 const value=settings[key]??fallback;
 if(!options.includes(value))throw new Error('Invalid '+key+' setting.');
 return value;
};
const rgb=(settings:AdvancedParams,key:string,fallback:string):[number,number,number]=>{
 const code=settings[key]??fallback;
 if(!/^#[0-9a-fA-F]{6}$/.test(code))throw new Error('Invalid '+key+' color; use #RRGGBB.');
 return [parseInt(code.slice(1,3),16),parseInt(code.slice(3,5),16),parseInt(code.slice(5,7),16)];
};
const safeText=(settings:AdvancedParams,key:string,fallback:string):string=>{
 const value=(settings[key]??fallback).replace(/\r\n?/g,'\n').trim();
 if(!value)throw new Error('Enter some text.');
 if([...value].length>LIMIT_TEXT)throw new Error('Text exceeds 300 characters.');
 return value;
};
const createCanvas=(image:LoadedImage):HTMLCanvasElement=>{
 const canvas=outputCanvas(image.width,image.height);
 ctx2d(canvas).drawImage(image.bitmap,0,0);
 return canvas;
};
const basename=(name:string)=>name.replace(/\.[^/.]+$/,'').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,72)||'image';
const createFile=async(canvas:HTMLCanvasElement,filename:string):Promise<AdvancedOutput>=>({
 filename,blob:await pngBlob(canvas),
});
const fit=(context:CanvasRenderingContext2D,image:LoadedImage,x:number,y:number,width:number,height:number)=>{
 const scale=Math.min(width/image.width,height/image.height);
 const w=image.width*scale,h=image.height*scale;
 context.drawImage(image.bitmap,x+(width-w)/2,y+(height-h)/2,w,h);
};
function softRoundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number):void{
 const radius=Math.min(r,w/2,h/2);
 ctx.beginPath();ctx.moveTo(x+radius,y);ctx.lineTo(x+w-radius,y);
 ctx.quadraticCurveTo(x+w,y,x+w,y+radius);
 ctx.lineTo(x+w,y+h-radius);ctx.quadraticCurveTo(x+w,y+h,x+w-radius,y+h);
 ctx.lineTo(x+radius,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-radius);
 ctx.lineTo(x,y+radius);ctx.quadraticCurveTo(x,y,x+radius,y);ctx.closePath();
}

export async function runAdvancedImageTool(
 id:string,images:readonly LoadedImage[],settings:AdvancedParams,
):Promise<AdvancedOutput[]>{
 if(images.length===0)throw new Error('Choose at least one JPG, PNG or WebP image.');
 const image=images[0]!;
 const base=basename(image.name);
 switch(id){
  case 'image-collage-maker':{
   if(images.length<2||images.length>12)throw new Error('Select between 2 and 12 images for a collage.');
   const columns=int(settings,'columns',3,1,4),size=int(settings,'tileSize',320,120,800);
   const gap=int(settings,'gap',12,0,60),background=rgb(settings,'background','#FFFFFF');
   const cols=Math.min(images.length,columns),rows=Math.ceil(images.length/cols);
   const canvas=outputCanvas(cols*size+(cols+1)*gap,rows*size+(rows+1)*gap);
   const ctx=ctx2d(canvas);ctx.fillStyle='rgb('+background.join(',')+')';
   ctx.fillRect(0,0,canvas.width,canvas.height);
   images.forEach((item,index)=>{
    const x=gap+(index%cols)*(size+gap),y=gap+Math.floor(index/cols)*(size+gap);
    fit(ctx,item,x,y,size,size);
   });
   return [await createFile(canvas,'image-collage.png')];
  }
  case 'split-image-into-grid':{
   if(images.length!==1)throw new Error('Grid splitting requires exactly one image.');
   const columns=int(settings,'columns',3,1,8),rows=int(settings,'rows',3,1,8);
   if(columns*rows<2)throw new Error('Choose at least two grid cells.');
   if(columns>image.width||rows>image.height)throw new Error('Image is too small for that many rows or columns.');
   const result:AdvancedOutput[]=[];
   // Encode a bounded group concurrently. Serial canvas.toBlob callbacks can be
   // heavily delayed in Chromium when exporting the maximum 64 small tiles.
   // Eight small canvases cap intermediate encoder memory without stalling UI.
   const tiles=Array.from({length:rows*columns},(_,index)=>({
    r:Math.floor(index/columns),c:index%columns,
   }));
   for(let offset=0;offset<tiles.length;offset+=8){
    const batch=await Promise.all(tiles.slice(offset,offset+8).map(async({r,c})=>{
     const x=Math.floor(c*image.width/columns),x2=Math.floor((c+1)*image.width/columns);
     const y=Math.floor(r*image.height/rows),y2=Math.floor((r+1)*image.height/rows);
     const tile=outputCanvas(x2-x,y2-y);
     ctx2d(tile).drawImage(image.bitmap,x,y,tile.width,tile.height,0,0,tile.width,tile.height);
     return createFile(tile,base+'-row-'+String(r+1).padStart(2,'0')+'-col-'+String(c+1).padStart(2,'0')+'.png');
    }));
    result.push(...batch);
   }
   return result;
  }
  case 'image-strip-slicer':{
   if(images.length!==1)throw new Error('Strip slicing requires exactly one image.');
   const direction=choice(settings,'direction','horizontal',['horizontal','vertical']);
   const count=int(settings,'count',4,2,20);
   const horizontal=direction==='horizontal',length=horizontal?image.height:image.width;
   if(count>length)throw new Error('Cannot create more strips than available pixels.');
   const result:AdvancedOutput[]=[];
   for(let i=0;i<count;i++){
    const start=Math.floor(i*length/count),end=Math.floor((i+1)*length/count);
    const x=horizontal?0:start,y=horizontal?start:0,w=horizontal?image.width:end-start,h=horizontal?end-start:image.height;
    const strip=outputCanvas(w,h);
    ctx2d(strip).drawImage(image.bitmap,x,y,w,h,0,0,w,h);
    result.push(await createFile(strip,base+'-strip-'+String(i+1).padStart(2,'0')+'.png'));
   }
   return result;
  }
  case 'add-text-to-image':{
   const canvas=createCanvas(image),ctx=ctx2d(canvas);
   const caption=safeText(settings,'text','Hello world!');
   const size=num(settings,'fontSize',48,12,180);
   const fontSize=Math.min(size,Math.max(10,Math.floor(image.width/8)),Math.max(10,Math.floor(image.height/3)));
   const color=rgb(settings,'color','#FFFFFF'),outline=rgb(settings,'outline','#161616');
   const position=choice(settings,'position','bottom',['top','center','bottom']);
   ctx.font='bold '+fontSize+'px system-ui, sans-serif';
   ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
   ctx.lineWidth=Math.max(2,fontSize/7);
   const lines=wrapText(ctx,caption,Math.max(10,image.width-24),Math.max(1,Math.floor(image.height/(fontSize*1.3))));
   const lineH=fontSize*1.22,total=lines.length*lineH;
   let y=position==='top'?12+total/2:position==='center'?image.height/2:image.height-12-total/2;
   y=Math.max(total/2,Math.min(image.height-total/2,y));
   ctx.fillStyle='rgb('+color.join(',')+')';
   ctx.strokeStyle='rgb('+outline.join(',')+')';
   lines.forEach((line,i)=>{const at=y-total/2+(i+0.5)*lineH;ctx.strokeText(line,image.width/2,at);ctx.fillText(line,image.width/2,at);});
   return [await createFile(canvas,base+'-caption.png')];
  }
  case 'speech-bubble-maker':{
   const canvas=createCanvas(image),ctx=ctx2d(canvas);
   const caption=safeText(settings,'text','What a day!');
   const percent=num(settings,'size',55,30,85);
   const place=choice(settings,'position','top-left',['top-left','top-right','bottom-left','bottom-right']);
   const fill=rgb(settings,'fill','#FFFFFF'),ink=rgb(settings,'color','#151515');
   const w=Math.max(40,Math.round(image.width*percent/100));
   const h=Math.max(34,Math.round(image.height*0.36));
   const pad=Math.max(4,Math.round(Math.min(image.width,image.height)*0.035));
   const left=place.endsWith('left'),top=place.startsWith('top');
   const x=left?pad:image.width-pad-w,y=top?pad:image.height-pad-h;
   if(x<0||y<0)throw new Error('Image is too small for the selected speech bubble.');
   const tailH=Math.min(Math.max(6,image.height*0.13),h*0.32);
   ctx.fillStyle='rgb('+fill.join(',')+')';
   ctx.strokeStyle='rgb('+ink.join(',')+')';ctx.lineWidth=Math.max(1,Math.round(Math.min(w,h)*0.018));
   softRoundRect(ctx,x,y,w,h,Math.min(22,h*0.2));ctx.fill();ctx.stroke();
   const tx=left?x+w*.3:x+w*.7;
   ctx.beginPath();
   ctx.moveTo(tx-8,top?y+h:y);ctx.lineTo(tx+(left?-12:12),top?y+h+tailH:y-tailH);
   ctx.lineTo(tx+14,top?y+h:y);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='rgb('+ink.join(',')+')';
   let fontSize=Math.max(10,Math.min(32,Math.round(Math.min(w/9,h/4))));
   let lines:string[]=[];
   for(let attempt=0;attempt<12;attempt++){
    ctx.font='bold '+fontSize+'px system-ui, sans-serif';
    try{lines=wrapText(ctx,caption,w-24,Math.max(1,Math.floor((h-14)/(fontSize*1.2))));break;}
    catch{fontSize=Math.max(8,fontSize-2);if(attempt===11)throw new Error('Bubble text is too long to fit.');}
   }
   const lineH=fontSize*1.18;
   lines.forEach((line,i)=>ctx.fillText(line,x+w/2,y+h/2+(i-(lines.length-1)/2)*lineH));
   return [await createFile(canvas,base+'-speech-bubble.png')];
  }
  case 'straighten-image':{
   const angle=num(settings,'angle',5,-30,30)*Math.PI/180;
   const mode=choice(settings,'mode','expand',['expand','original-size']);
   const width=mode==='expand'?Math.ceil(Math.abs(image.width*Math.cos(angle))+Math.abs(image.height*Math.sin(angle))):image.width;
   const height=mode==='expand'?Math.ceil(Math.abs(image.height*Math.cos(angle))+Math.abs(image.width*Math.sin(angle))):image.height;
   const canvas=outputCanvas(width,height),ctx=ctx2d(canvas);
   ctx.translate(width/2,height/2);ctx.rotate(angle);
   ctx.drawImage(image.bitmap,-image.width/2,-image.height/2);
   return [await createFile(canvas,base+'-straightened.png')];
  }
  default:break;
 }
 // Remaining tools process image pixels while retaining alpha unchanged.
 if(images.length!==1)throw new Error('This adjustment needs exactly one image.');
 if(![
  'duotone-image-effect','vignette-image-effect','temperature-tint-adjuster','gamma-correction',
  'auto-image-levels','rgb-channel-mixer','solid-background-remover',
 ].includes(id))throw new Error('Unsupported advanced image tool: '+id);
 const canvas=createCanvas(image),ctx=ctx2d(canvas,true);
 const data=ctx.getImageData(0,0,canvas.width,canvas.height);
 const rgba=data.data,w=canvas.width,h=canvas.height;
 if(id==='duotone-image-effect'){
  const dark=rgb(settings,'dark','#1B2544'),light=rgb(settings,'light','#F7D27B');
  for(let i=0;i<rgba.length;i+=4){
   if(rgba[i+3]===0)continue;
   const l=(0.2126*rgba[i]!+0.7152*rgba[i+1]!+0.0722*rgba[i+2]!)/255;
   for(let c=0;c<3;c++)rgba[i+c]=clamp(Math.round(dark[c]!*(1-l)+light[c]!*l));
  }
 }else if(id==='vignette-image-effect'){
  const strength=num(settings,'strength',65,0,100)/100;
  const radius=num(settings,'radius',50,10,95)/100;
  const cx=w/2,cy=h/2,maxRadius=Math.hypot(cx,cy);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=(y*w+x)*4;if(rgba[i+3]===0)continue;
   const r=Math.hypot((x+.5-cx)/Math.max(cx,1),(y+.5-cy)/Math.max(cy,1))/Math.SQRT2;
   const t=clamp((r-radius)/(1-radius),0,1);
   const eased=t*t*(3-2*t),factor=1-strength*eased;
   rgba[i]=Math.round(rgba[i]!*factor);rgba[i+1]=Math.round(rgba[i+1]!*factor);rgba[i+2]=Math.round(rgba[i+2]!*factor);
  }
  void maxRadius;
 }else if(id==='temperature-tint-adjuster'){
  const temp=num(settings,'temperature',25,-100,100),tint=num(settings,'tint',0,-100,100);
  for(let i=0;i<rgba.length;i+=4){
   if(rgba[i+3]===0)continue;
   rgba[i]=clamp(Math.round(rgba[i]!+temp*.75+tint*.35));
   rgba[i+1]=clamp(Math.round(rgba[i+1]!-tint*.55));
   rgba[i+2]=clamp(Math.round(rgba[i+2]!-temp*.75+tint*.35));
  }
 }else if(id==='gamma-correction'){
  const gamma=num(settings,'gamma',1.35,0.2,3);
  const lut=Uint8Array.from({length:256},(_,i)=>clamp(Math.round(255*Math.pow(i/255,1/gamma))));
  for(let i=0;i<rgba.length;i+=4){
   if(rgba[i+3]===0)continue;
   rgba[i]=lut[rgba[i]!]!;rgba[i+1]=lut[rgba[i+1]!]!;rgba[i+2]=lut[rgba[i+2]!]!;
  }
 }else if(id==='auto-image-levels'){
  const clip=num(settings,'clip',1,0,5)/100;
  const hist=Array.from({length:3},()=>new Uint32Array(256));let count=0;
  for(let i=0;i<rgba.length;i+=4){
   if(rgba[i+3]===0)continue;
   count++;
   for(let c=0;c<3;c++){const channel=hist[c]!;const v=rgba[i+c]!;channel[v]=channel[v]!+1;}
  }
  if(count===0)throw new Error('No visible pixels to analyze.');
  const range=hist.map(channel=>{
   let cumulative=0,lo=0,hi=255;
   for(let i=0;i<256;i++){cumulative+=channel[i]!;if(cumulative>count*clip){lo=i;break;}}
   cumulative=0;
   for(let i=255;i>=0;i--){cumulative+=channel[i]!;if(cumulative>count*clip){hi=i;break;}}
   return [lo,hi];
  });
  for(let i=0;i<rgba.length;i+=4){
   if(rgba[i+3]===0)continue;
   for(let c=0;c<3;c++){
    const [lo,hi]=range[c]! as [number,number];
    if(hi>lo)rgba[i+c]=clamp(Math.round((rgba[i+c]!-lo)*255/(hi-lo)));
   }
  }
 }else if(id==='rgb-channel-mixer'){
  const matrix=[
   num(settings,'rr',100,-200,200)/100,num(settings,'rg',0,-200,200)/100,num(settings,'rb',0,-200,200)/100,
   num(settings,'gr',0,-200,200)/100,num(settings,'gg',100,-200,200)/100,num(settings,'gb',0,-200,200)/100,
   num(settings,'br',0,-200,200)/100,num(settings,'bg',0,-200,200)/100,num(settings,'bb',100,-200,200)/100,
  ];
  for(let i=0;i<rgba.length;i+=4){
   if(rgba[i+3]===0)continue;
   const r=rgba[i]!,g=rgba[i+1]!,b=rgba[i+2]!;
   rgba[i]=clamp(Math.round(r*matrix[0]!+g*matrix[1]!+b*matrix[2]!));
   rgba[i+1]=clamp(Math.round(r*matrix[3]!+g*matrix[4]!+b*matrix[5]!));
   rgba[i+2]=clamp(Math.round(r*matrix[6]!+g*matrix[7]!+b*matrix[8]!));
  }
 }else if(id==='solid-background-remover'){
  const corner=choice(settings,'corner','top-left',['top-left','top-right','bottom-left','bottom-right']);
  const tolerance=num(settings,'tolerance',35,0,150);
  const x=corner.endsWith('left')?0:w-1,y=corner.startsWith('top')?0:h-1;
  const sample=(y*w+x)*4,br=rgba[sample]!,bg=rgba[sample+1]!,bb=rgba[sample+2]!;
  if(rgba[sample+3]===0)throw new Error('Chosen corner is already transparent. Select an opaque background corner.');
  const visited=new Uint8Array(w*h),queue=new Int32Array(w*h);
  let head=0,tail=0,changed=0;
  const threshold=tolerance*tolerance*3;
  const visit=(xx:number,yy:number)=>{
   if(xx<0||yy<0||xx>=w||yy>=h)return;
   const index=yy*w+xx;
   if(visited[index])return;
   visited[index]=1;
   const at=index*4;
   if(rgba[at+3]===0)return;
   const dr=rgba[at]!-br,dg=rgba[at+1]!-bg,db=rgba[at+2]!-bb;
   if(dr*dr+dg*dg+db*db>threshold)return;
   queue[tail++]=index;
  };
  visit(x,y);
  while(head<tail){
   const pixel=queue[head++]!,xx=pixel%w,yy=(pixel-xx)/w;
   rgba[pixel*4+3]=0;changed++;
   visit(xx-1,yy);visit(xx+1,yy);visit(xx,yy-1);visit(xx,yy+1);
  }
  if(changed===0)throw new Error('No contiguous solid-color background was found.');
 }
 ctx.putImageData(data,0,0);
 return [await createFile(canvas,base+'-'+id+'.png')];
}
