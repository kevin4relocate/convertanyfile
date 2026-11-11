/**
 * Defensive, read-only TIFF/EXIF tag extraction.
 * Supports JPEG APP1, PNG eXIf and WebP EXIF chunks. Other metadata formats
 * (XMP, IPTC, MakerNotes) are intentionally outside this tool's scope.
 */
const EXIF_NAMES:Readonly<Record<number,string>>={
  0x0100:'Image Width',0x0101:'Image Height',0x010E:'Image Description',
  0x010F:'Camera Make',0x0110:'Camera Model',0x0112:'Orientation',
  0x011A:'X Resolution',0x011B:'Y Resolution',0x0128:'Resolution Unit',
  0x0131:'Software',0x0132:'Modified Date',0x013B:'Artist',
  0x8298:'Copyright',0x829A:'Exposure Time',0x829D:'F Number',
  0x8822:'Exposure Program',0x8827:'ISO',0x9000:'EXIF Version',
  0x9003:'Capture Date',0x9004:'Digitized Date',0x9204:'Exposure Bias',
  0x9207:'Metering Mode',0x9209:'Flash',0x920A:'Focal Length',
  0xA001:'Color Space',0xA002:'Pixel Width',0xA003:'Pixel Height',
  0xA403:'White Balance',0xA405:'Focal Length 35mm',
};
const GPS_NAMES:Readonly<Record<number,string>>={
  0:'GPS Version',1:'Latitude Reference',2:'GPS Latitude',
  3:'Longitude Reference',4:'GPS Longitude',
  5:'Altitude Reference',6:'GPS Altitude',7:'GPS Time',
  16:'GPS Image Direction Reference',17:'GPS Image Direction',
  29:'GPS Date',
};
const TYPE_SIZES:Readonly<Record<number,number>>={1:1,2:1,3:2,4:4,5:8,6:1,7:1,8:2,9:4,10:8,11:4,12:8};

export function extractExifBlock(bytes:Uint8Array):Uint8Array|undefined {
  const length=bytes.length;
  const ascii=(offset:number,n:number)=>String.fromCharCode(...bytes.subarray(offset,offset+n));
  if(length>=4&&bytes[0]===0xFF&&bytes[1]===0xD8) {
    let pos=2;
    while(pos+4<=length) {
      if(bytes[pos]!==0xFF)break;
      while(bytes[pos]===0xFF)pos++;
      const marker=bytes[pos++]!;
      if(marker===0xDA||marker===0xD9)break;
      if(marker===0x01||(marker>=0xD0&&marker<=0xD7))continue;
      if(pos+2>length)break;
      const size=(bytes[pos]!<<8)|bytes[pos+1]!,start=pos+2,end=pos+size;
      if(size<2||end>length)break;
      if(marker===0xE1&&end-start>=6&&ascii(start,4)==='Exif'&&bytes[start+4]===0&&bytes[start+5]===0)
        return bytes.subarray(start+6,end);
      pos=end;
    }
    return undefined;
  }
  if(length>=8&&bytes[0]===137&&ascii(1,3)==='PNG') {
    let pos=8;
    while(pos+12<=length) {
      const size=((bytes[pos]!<<24)|(bytes[pos+1]!<<16)|(bytes[pos+2]!<<8)|bytes[pos+3]!)>>>0;
      const start=pos+8,end=start+size;
      if(end+4>length)break;
      if(ascii(pos+4,4)==='eXIf')return bytes.subarray(start,end);
      pos=end+4;
    }
    return undefined;
  }
  if(length>=12&&ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP') {
    let pos=12;
    while(pos+8<=length) {
      const size=(bytes[pos]!+(bytes[pos+1]!<<8)+(bytes[pos+2]!<<16)+(bytes[pos+3]!*2**24))>>>0;
      const start=pos+8,end=start+size;
      if(end>length)break;
      if(ascii(pos,4)==='EXIF') {
        const hasPrefix=size>=6&&ascii(start,4)==='Exif'&&bytes[start+4]===0&&bytes[start+5]===0;
        return bytes.subarray(start+(hasPrefix?6:0),end);
      }
      pos=end+(size%2);
    }
  }
  return undefined;
}
export function parseExifBytes(bytes:Uint8Array):string {
  const block=extractExifBlock(bytes);
  if(!block||block.length<8)return 'No supported EXIF block was found in this image.';
  const view=new DataView(block.buffer,block.byteOffset,block.byteLength);
  const ascii=(offset:number,count:number)=>String.fromCharCode(...block.subarray(offset,offset+count));
  const byteOrder=ascii(0,2);
  if(byteOrder!=='II'&&byteOrder!=='MM')return 'The embedded EXIF block has an unsupported TIFF byte order.';
  const little=byteOrder==='II';
  const has=(offset:number,size:number)=>Number.isSafeInteger(offset)&&offset>=0&&size>=0&&offset+size<=block.length;
  const u16=(at:number)=>has(at,2)?view.getUint16(at,little):undefined;
  const u32=(at:number)=>has(at,4)?view.getUint32(at,little):undefined;
  if(u16(2)!==42)return 'EXIF TIFF header is invalid or unsupported.';
  const records:string[]=[];
  const visited=new Set<number>();
  const getValue=(position:number,type:number,count:number):string|undefined=>{
    const size=TYPE_SIZES[type],width=size*count;
    if(!size||!Number.isSafeInteger(width)||count<1||count>4096||width>16384)return;
    const at=width<=4?position+8:u32(position+8);
    if(at===undefined||!has(at,width))return;
    if(type===2||type===7&&count>=4) {
      const raw=block.subarray(at,at+Math.min(count,256));
      const text=String.fromCharCode(...raw).replace(/\0/g,'').trim();
      return type===7&&/[^ -~]/.test(text)?Array.from(raw.slice(0,12)).map(x=>x.toString(16).padStart(2,'0')).join(' '):text.slice(0,150);
    }
    const values:string[]=[];
    for(let i=0;i<Math.min(count,6);i++){
      const p=at+i*size;
      if(type===1||type===6||type===7) values.push(String(block[p]));
      else if(type===3) values.push(String(u16(p)));
      else if(type===4) values.push(String(u32(p)));
      else if(type===5||type===10) {
        const signed=type===10;
        const numerator=signed?view.getInt32(p,little):view.getUint32(p,little);
        const denominator=signed?view.getInt32(p+4,little):view.getUint32(p+4,little);
        values.push(denominator===0?String(numerator)+'/0':String(Math.round((numerator/denominator)*10000)/10000));
      } else if(type===8) values.push(String(view.getInt16(p,little)));
      else if(type===9) values.push(String(view.getInt32(p,little)));
      else if(type===11) values.push(String(view.getFloat32(p,little)));
      else if(type===12) values.push(String(view.getFloat64(p,little)));
    }
    return values.join(', ')+(count>6?' …':'');
  };
  const parseIfd=(relative:number,prefix:string,depth:number):void=>{
    if(depth>3||visited.has(relative)||!has(relative,2))return;
    visited.add(relative);
    const total=u16(relative)??0;
    const n=Math.min(total,200);
    for(let i=0;i<n;i++){
      const p=relative+2+i*12;
      if(!has(p,12))break;
      const id=u16(p)!,type=u16(p+2)!,count=u32(p+4)!;
      if(id===0x8769||id===0x8825||id===0xA005){
        const sub=u32(p+8);
        if(sub!==undefined)parseIfd(sub,id===0x8825?'GPS':id===0x8769?'EXIF':'Interop',depth+1);
        continue;
      }
      const label=prefix==='GPS'?GPS_NAMES[id]:EXIF_NAMES[id];
      if(!label)continue;
      const value=getValue(p,type,count);
      if(value)records.push((prefix==='IFD0'?'':prefix+' · ')+label+': '+value);
    }
    if(prefix==='IFD0') {
      const next=u32(relative+2+total*12);
      if(next!==undefined&&next!==0)parseIfd(next,'IFD1',depth+1);
    }
  };
  parseIfd(u32(4)??0,'IFD0',0);
  return records.length?records.join('\n'):'EXIF block found, but no supported readable tags were present.';
}
