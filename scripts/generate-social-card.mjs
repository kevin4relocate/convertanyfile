// Deterministic source-based OG PNG. No AI or external services.
// Palette/geometry mirror public/favicon.svg and src/styles/dark-theme.css.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
const W=1200,H=630, pixels=new Uint8Array(W*H*4);
const blend=(x,y,color,a=1)=>{
 if(x<0||y<0||x>=W||y>=H||a<=0)return;
 const i=(y*W+x)*4,inv=1-a;
 for(let k=0;k<3;k++)pixels[i+k]=Math.round(pixels[i+k]*inv+color[k]*a);
 pixels[i+3]=255;
};
const rgba=(hex)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const rounded=(x,y,w,h,r,fill,stroke=null,sw=0)=>{
 const inRound=(px,py,x0,y0,ww,hh,rr)=>{
  const cx=Math.max(x0+rr,Math.min(px,x0+ww-rr));
  const cy=Math.max(y0+rr,Math.min(py,y0+hh-rr));
  return (px-cx)**2+(py-cy)**2<=rr*rr;
 };
 const outer=rgba(fill),border=stroke?rgba(stroke):null;
 const x0=Math.max(0,Math.floor(x)),x1=Math.min(W,Math.ceil(x+w));
 const y0=Math.max(0,Math.floor(y)),y1=Math.min(H,Math.ceil(y+h));
 for(let py=y0;py<y1;py++)for(let px=x0;px<x1;px++){
  if(!inRound(px+.5,py+.5,x,y,w,h,r))continue;
  if(border && !inRound(px+.5,py+.5,x+sw,y+sw,w-2*sw,h-2*sw,Math.max(0,r-sw)))blend(px,py,border);
  else blend(px,py,outer);
 }
};
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const i=(y*W+x)*4,dist=Math.hypot((x-440)/550,(y-310)/430),light=Math.max(0,1-dist);
 pixels[i]=11+Math.round(24*light);pixels[i+1]=14+Math.round(13*light);pixels[i+2]=20+Math.round(48*light);pixels[i+3]=255;
}
// Exact favicon geometry in larger units, preserving all three fills/outlines.
const scale=5.2, ox=120,oy=157;
const tile=(x,y,color,line)=>rounded(ox+x*scale,oy+y*scale,26*scale,26*scale,7*scale,color,line,4*scale);
tile(11,28,'#141923','#d9dce7');
tile(20,19,'#201f3b','#7770d8');
tile(29,10,'#7c73ff','#7c73ff');
// Font is a self-contained bitmap wordmark to avoid font downloads and runtime differences.
const glyphs={
 A:['01110','10001','10001','11111','10001','10001','10001'],
 B:['11110','10001','10001','11110','10001','10001','11110'],
 C:['01111','10000','10000','10000','10000','10000','01111'],
 D:['11110','10001','10001','10001','10001','10001','11110'],
 E:['11111','10000','10000','11110','10000','10000','11111'],
 F:['11111','10000','10000','11110','10000','10000','10000'],
 G:['01111','10000','10000','10111','10001','10001','01111'],
 H:['10001','10001','10001','11111','10001','10001','10001'],
 I:['11111','00100','00100','00100','00100','00100','11111'],
 J:['00111','00010','00010','00010','10010','10010','01100'],
 K:['10001','10010','10100','11000','10100','10010','10001'],
 L:['10000','10000','10000','10000','10000','10000','11111'],
 M:['10001','11011','10101','10101','10001','10001','10001'],
 N:['10001','11001','10101','10011','10001','10001','10001'],
 O:['01110','10001','10001','10001','10001','10001','01110'],
 P:['11110','10001','10001','11110','10000','10000','10000'],
 Q:['01110','10001','10001','10001','10101','10010','01101'],
 R:['11110','10001','10001','11110','10100','10010','10001'],
 S:['01111','10000','10000','01110','00001','00001','11110'],
 T:['11111','00100','00100','00100','00100','00100','00100'],
 U:['10001','10001','10001','10001','10001','10001','01110'],
 V:['10001','10001','10001','10001','10001','01010','00100'],
 W:['10001','10001','10001','10101','10101','10101','01010'],
 X:['10001','10001','01010','00100','01010','10001','10001'],
 Y:['10001','10001','01010','00100','00100','00100','00100'],
 Z:['11111','00001','00010','00100','01000','10000','11111'],
 ' ':['00000','00000','00000','00000','00000','00000','00000'],
 '-':['00000','00000','00000','11111','00000','00000','00000'],
 '.':['00000','00000','00000','00000','00000','01100','01100']
};
function drawText(text,x,y,pixel,color){
 const ink=rgba(color);let xx=x;
 for(const letter of text.toUpperCase()){
  const g=glyphs[letter]||glyphs[' '];
  for(let gy=0;gy<7;gy++)for(let gx=0;gx<5;gx++)if(g[gy][gx]==='1'){
   const px0=Math.round(xx+gx*pixel),py0=Math.round(y+gy*pixel);
   for(let j=0;j<pixel;j++)for(let i=0;i<pixel;i++)blend(px0+i,py0+j,ink);
  }
  xx+=pixel*6;
 }
}
drawText('ConvertAnyFile',504,247,7,'#f3f5fb');
drawText('Local-first file tools',508,343,3,'#aaa4ff');
drawText('Private. In your browser.',508,395,2,'#a7adbb');
rounded(504,447,545,3,1.5,'#7c73ff');
const table=(()=>{const t=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[i]=c>>>0;}return t;})();
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
const u32=n=>Buffer.from([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]);
const chunk=(name,data)=>{const tag=Buffer.from(name);return Buffer.concat([u32(data.length),tag,data,u32(crc32(Buffer.concat([tag,data])))]);};
const raw=Buffer.alloc(H*(W*4+1));
for(let y=0;y<H;y++){const off=y*(W*4+1);raw[off]=0;raw.set(pixels.subarray(y*W*4,(y+1)*W*4),off+1);}
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',Buffer.concat([u32(W),u32(H),Buffer.from([8,6,0,0,0])])),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
writeFileSync(new URL('../public/social-card.png',import.meta.url),png);
process.stdout.write('Created public/social-card.png ('+W+'x'+H+', '+png.length+' bytes)\n');
