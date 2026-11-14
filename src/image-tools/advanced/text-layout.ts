/** Layout helper shared by the advanced image caption and speech-bubble tools. */
export function wrapText(ctx:CanvasRenderingContext2D,text:string,maxWidth:number,maxLines:number):string[]{
 const lines:string[]=[];
 for(const para of text.split('\n')){
  let current='';
  for(const word of para.split(/\s+/).filter(Boolean)){
   const proposed=current?current+' '+word:word;
   if(ctx.measureText(proposed).width<=maxWidth){current=proposed;continue;}
   if(current){lines.push(current);current='';}
   // Break long words instead of painting beyond image bounds.
   for(const char of word){
    if(ctx.measureText(current+char).width>maxWidth&&current){lines.push(current);current='';}
    current+=char;
   }
  }
  lines.push(current);
 }
 if(lines.length>maxLines)throw new Error('Text is too long to fit. Reduce font size or shorten the caption.');
 return lines;
}
