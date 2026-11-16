// Shared strict CSV helpers for both conversion directions.
export function parseCsv(source){
  if(typeof source!=='string'||!source.trim())throw Error('CSV input is empty.');
  const s=source.replace(/^\uFEFF/,'');
  const rows=[];let row=[],cell='',inQuotes=false,afterQuotes=false,started=false;
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(inQuotes){
      if(c==='"'&&s[i+1]==='"'){cell+='"';i++;}
      else if(c==='"'){inQuotes=false;afterQuotes=true;}
      else cell+=c;
      started=true;continue;
    }
    if(c==='"'){
      if(started||afterQuotes)throw Error('Unexpected CSV quote.');
      inQuotes=true;started=true;continue;
    }
    if(c===','){
      row.push(cell);cell='';afterQuotes=false;started=false;continue;
    }
    if(c==='\n'||c==='\r'){
      if(c==='\r'&&s[i+1]==='\n')i++;
      row.push(cell);rows.push(row);row=[];cell='';afterQuotes=false;started=false;continue;
    }
    if(afterQuotes)throw Error('Unexpected characters after a quoted CSV field.');
    cell+=c;started=true;
  }
  if(inQuotes)throw Error('Unclosed CSV quoted field.');
  if(started||afterQuotes||row.length){row.push(cell);rows.push(row);}
  if(!rows.length)throw Error('CSV input is empty.');
  const width=rows[0].length;
  if(!width||rows.some(r=>r.length!==width))throw Error('All CSV rows must have the same number of columns.');
  return rows;
}
export function writeCsv(rows){
  return rows.map(row=>row.map(value=>{
    const text=String(value??'');
    return /[",\r\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;
  }).join(',')).join('\n');
}
export function xmlEscape(text){
  return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
export function ensureXmlChars(text){
  for(const character of text){
    const code=character.codePointAt(0);
    const accepted=code===9||code===10||code===13||(code>=32&&code<=0xD7FF)||(code>=0xE000&&code<=0xFFFD)||(code>=0x10000&&code<=0x10FFFF);
    if(!accepted)throw Error('Input contains characters not permitted in XML 1.0.');
  }
}
