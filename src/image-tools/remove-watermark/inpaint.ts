import type { MaskOperation, PixelPoint, PixelRect } from '../../platform/image-tools/types';

function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
function rotation(operation: MaskOperation): number { return Number.isFinite(operation.rotation) ? operation.rotation ?? 0 : 0; }

function rectBounds(width: number, height: number, rect: PixelRect): { left: number; top: number; right: number; bottom: number } {
  const left = clamp(Math.floor(rect.x), 0, width - 1);
  const top = clamp(Math.floor(rect.y), 0, height - 1);
  const right = clamp(Math.ceil(rect.x + rect.width), left + 1, width);
  const bottom = clamp(Math.ceil(rect.y + rect.height), top + 1, height);
  return { left, top, right, bottom };
}

function rotatedBounds(width: number, height: number, rect: PixelRect, degrees: number): { left:number; top:number; right:number; bottom:number } {
  if (!degrees) return rectBounds(width, height, rect);
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const radians = degrees * Math.PI / 180;
  const cos = Math.cos(radians), sin = Math.sin(radians);
  const corners = [
    {x:rect.x,y:rect.y},{x:rect.x+rect.width,y:rect.y},{x:rect.x+rect.width,y:rect.y+rect.height},{x:rect.x,y:rect.y+rect.height},
  ].map(({x,y})=>{const dx=x-cx,dy=y-cy;return{x:cx+dx*cos-dy*sin,y:cy+dx*sin+dy*cos}});
  const minX=Math.min(...corners.map(p=>p.x)), maxX=Math.max(...corners.map(p=>p.x));
  const minY=Math.min(...corners.map(p=>p.y)), maxY=Math.max(...corners.map(p=>p.y));
  return rectBounds(width,height,{x:minX,y:minY,width:maxX-minX,height:maxY-minY});
}

function inverseRotate(x:number,y:number,rect:PixelRect,degrees:number):PixelPoint{
  if(!degrees)return{x,y};
  const cx=rect.x+rect.width/2,cy=rect.y+rect.height/2,rad=-degrees*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad),dx=x-cx,dy=y-cy;
  return{x:cx+dx*cos-dy*sin,y:cy+dx*sin+dy*cos};
}

function paintRect(mask: Uint8Array, width: number, height: number, rect: PixelRect, degrees=0): void {
  const { left, top, right, bottom } = rotatedBounds(width,height,rect,degrees);
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
    const p=inverseRotate(x+.5,y+.5,rect,degrees);
    if(p.x>=rect.x&&p.x<=rect.x+rect.width&&p.y>=rect.y&&p.y<=rect.y+rect.height)mask[y*width+x]=1;
  }
}

function paintEllipse(mask: Uint8Array, width: number, height: number, rect: PixelRect, degrees=0): void {
  const { left, top, right, bottom } = rotatedBounds(width,height,rect,degrees);
  const cx=rect.x+rect.width/2,cy=rect.y+rect.height/2,rx=Math.max(.5,rect.width/2),ry=Math.max(.5,rect.height/2);
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
    const p=inverseRotate(x+.5,y+.5,rect,degrees),nx=(p.x-cx)/rx,ny=(p.y-cy)/ry;
    if(nx*nx+ny*ny<=1)mask[y*width+x]=1;
  }
}

function star4Vertices(rect: PixelRect): PixelPoint[] {
  const cx=rect.x+rect.width/2,cy=rect.y+rect.height/2,rx=Math.max(.5,rect.width/2),ry=Math.max(.5,rect.height/2),innerX=rx*.2,innerY=ry*.2;
  return [{x:cx,y:cy-ry},{x:cx+innerX,y:cy-innerY},{x:cx+rx,y:cy},{x:cx+innerX,y:cy+innerY},{x:cx,y:cy+ry},{x:cx-innerX,y:cy+innerY},{x:cx-rx,y:cy},{x:cx-innerX,y:cy-innerY}];
}
function diamondVertices(rect: PixelRect): PixelPoint[] {const cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;return[{x:cx,y:rect.y},{x:rect.x+rect.width,y:cy},{x:cx,y:rect.y+rect.height},{x:rect.x,y:cy}]}
function pointInPolygon(x:number,y:number,vertices:readonly PixelPoint[]):boolean{let inside=false;for(let i=0,j=vertices.length-1;i<vertices.length;j=i,i++){const a=vertices[i],b=vertices[j];if(!a||!b)continue;const cross=(a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/((b.y-a.y)||Number.EPSILON)+a.x;if(cross)inside=!inside}return inside}
function paintPolygon(mask:Uint8Array,width:number,height:number,rect:PixelRect,vertices:readonly PixelPoint[],degrees=0):void{
  const {left,top,right,bottom}=rotatedBounds(width,height,rect,degrees);
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){const p=inverseRotate(x+.5,y+.5,rect,degrees);if(pointInPolygon(p.x,p.y,vertices))mask[y*width+x]=1}
}

function paintText(mask:Uint8Array,width:number,height:number,rect:PixelRect,text:string,degrees=0):void{
  const clean=text.trim();if(!clean)return;
  if(typeof OffscreenCanvas==='undefined')throw new Error('Text masks are not supported by this browser. Use a shape mask instead.');
  const bounds=rotatedBounds(width,height,rect,degrees),localWidth=Math.max(1,bounds.right-bounds.left),localHeight=Math.max(1,bounds.bottom-bounds.top);
  const canvas=new OffscreenCanvas(localWidth,localHeight),context=canvas.getContext('2d',{willReadFrequently:true});
  if(!context)throw new Error('Text masks are not supported by this browser. Use a shape mask instead.');
  const cx=rect.x+rect.width/2-bounds.left,cy=rect.y+rect.height/2-bounds.top;
  context.save();context.translate(cx,cy);context.rotate(degrees*Math.PI/180);
  let fontSize=Math.max(6,rect.height*.76);context.font=`900 ${fontSize}px sans-serif`;
  const maxWidth=Math.max(1,rect.width*.92),measured=Math.max(1,context.measureText(clean).width);
  if(measured>maxWidth){fontSize=Math.max(6,fontSize*maxWidth/measured);context.font=`900 ${fontSize}px sans-serif`}
  context.fillStyle='#fff';context.strokeStyle='#fff';context.textAlign='center';context.textBaseline='middle';context.lineJoin='round';context.lineCap='round';context.lineWidth=Math.max(2,fontSize*.18);
  context.strokeText(clean,0,0);context.fillText(clean,0,0);context.restore();
  const pixels=context.getImageData(0,0,localWidth,localHeight).data;
  for(let y=0;y<localHeight;y++)for(let x=0;x<localWidth;x++)if((pixels[(y*localWidth+x)*4+3]??0)>=18){const tx=bounds.left+x,ty=bounds.top+y;if(tx>=0&&ty>=0&&tx<width&&ty<height)mask[ty*width+tx]=1}
}

export function rasterizeMask(width:number,height:number,operations:readonly MaskOperation[]):Uint8Array{
  const mask=new Uint8Array(width*height);
  for(const operation of operations){const degrees=rotation(operation);if(operation.type==='rect')paintRect(mask,width,height,operation.rect,degrees);else if(operation.type==='ellipse')paintEllipse(mask,width,height,operation.rect,degrees);else if(operation.type==='diamond')paintPolygon(mask,width,height,operation.rect,diamondVertices(operation.rect),degrees);else if(operation.type==='star4')paintPolygon(mask,width,height,operation.rect,star4Vertices(operation.rect),degrees);else paintText(mask,width,height,operation.rect,operation.text,degrees)}
  return mask;
}

function isKnownNeighbor(mask:Uint8Array,width:number,height:number,x:number,y:number):boolean{for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(dx===0&&dy===0)continue;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;if((mask[ny*width+nx]??1)===0)return true}return false}
function fillFromKnownNeighbors(rgba:Uint8ClampedArray,mask:Uint8Array,width:number,height:number,x:number,y:number):void{const radius=5;let weightSum=0,red=0,green=0,blue=0,alpha=0;for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){if(dx===0&&dy===0)continue;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;const pi=ny*width+nx;if((mask[pi]??1)!==0)continue;const weight=1/(1+dx*dx+dy*dy),ri=pi*4;red+=(rgba[ri]??0)*weight;green+=(rgba[ri+1]??0)*weight;blue+=(rgba[ri+2]??0)*weight;alpha+=(rgba[ri+3]??255)*weight;weightSum+=weight}if(weightSum<=0)return;const target=(y*width+x)*4;rgba[target]=Math.round(red/weightSum);rgba[target+1]=Math.round(green/weightSum);rgba[target+2]=Math.round(blue/weightSum);rgba[target+3]=Math.round(alpha/weightSum)}

export function inpaintMaskedPixels(rgba:Uint8ClampedArray,width:number,height:number,operations:readonly MaskOperation[]):{pixels:Uint8ClampedArray;repairedPixels:number}{
  const mask=rasterizeMask(width,height,operations);let count=0,minX=width,minY=height,maxX=-1,maxY=-1;
  for(let y=0;y<height;y++){const row=y*width;for(let x=0;x<width;x++)if((mask[row+x]??0)===1){count++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}}
  if(!count)throw new Error('Add a visible-pixel mask before running repair.');if(count>width*height*.15)throw new Error('The selected mask is too large for local repair. Select a smaller area.');
  const queue=new Int32Array(count);let head=0,tail=0;for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const index=y*width+x;if((mask[index]??0)!==1||!isKnownNeighbor(mask,width,height,x,y))continue;mask[index]=2;queue[tail++]=index}
  while(head<tail){const index=queue[head++]??0,x=index%width,y=Math.floor(index/width);fillFromKnownNeighbors(rgba,mask,width,height,x,y);mask[index]=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(dx===0&&dy===0)continue;const nx=x+dx,ny=y+dy;if(nx<minX||ny<minY||nx>maxX||ny>maxY)continue;const next=ny*width+nx;if((mask[next]??0)!==1)continue;mask[next]=2;if(tail<queue.length)queue[tail++]=next}}
  return{pixels:rgba,repairedPixels:count};
}
