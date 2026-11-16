import {parseCsv,writeCsv,xmlEscape,ensureXmlChars} from './shared.mjs';

const identifier=/^[A-Za-z_][A-Za-z0-9_-]*$/;
const object = input => {
  const value=JSON.parse(input);
  if(!value||Array.isArray(value)||typeof value!=='object')throw Error('Expected a JSON object.');
  return value;
};
const flat = input => {
  const value=typeof input==='string'?object(input):input;
  if(!value||Array.isArray(value)||typeof value!=='object')throw Error('Expected a flat object.');
  for(const [key,item] of Object.entries(value)){
    if(!identifier.test(key))throw Error('Only simple identifier keys are supported: '+key);
    if(item!==null&&typeof item==='object')throw Error('Nested objects and arrays are not supported.');
    if(typeof item==='number'&&!Number.isFinite(item))throw Error('Non-finite numbers are unsupported.');
  }
  return value;
};
const scalar = value => {
  if(value===null)return 'null';
  if(typeof value==='string')return JSON.stringify(value);
  if(typeof value==='number'||typeof value==='boolean')return String(value);
  throw Error('Only scalar values are supported.');
};
export function yamlToObject(src){
  const out=Object.create(null);
  for(const raw of src.replace(/^\uFEFF/,'').split(/\r?\n/)){
    const line=raw.trim();if(!line||line.startsWith('#'))continue;
    if(raw!==line)throw Error('Indented or nested YAML is not supported.');
    const match=/^([A-Za-z_][A-Za-z0-9_-]*):[ \t]+(.+)$/.exec(line);
    if(!match)throw Error('Use simple YAML key: value lines.');
    if(Object.hasOwn(out,match[1]))throw Error('Duplicate YAML key: '+match[1]);
    const value=match[2];let parsed;
    if(value.startsWith('"')){parsed=JSON.parse(value);if(typeof parsed!=='string')throw Error('Expected YAML string.');}
    else if(value.startsWith("'")){if(!value.endsWith("'"))throw Error('Unclosed YAML string.');parsed=value.slice(1,-1).replace(/''/g,"'");}
    else if(value==='null'||value==='~')parsed=null;
    else if(value==='true'||value==='false')parsed=value==='true';
    else if(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)){
      parsed=Number(value);if(!Number.isFinite(parsed)||Number.isInteger(parsed)&&!Number.isSafeInteger(parsed))throw Error('Unsafe YAML number.');
    }else{
      if(/[:#{}\[\],&*!|>%@]|\s{2,}/.test(value)||value.startsWith('- ')||value.startsWith('---'))throw Error('Unsupported or ambiguous YAML scalar: '+value);
      if(value==='True'||value==='False'||value==='NULL'||/^[-+]?\d/.test(value))throw Error('Ambiguous YAML scalar: '+value);
      parsed=value;
    }
    Object.defineProperty(out,match[1],{value:parsed,enumerable:true,configurable:true,writable:true});
  }
  return out;
}
export function tomlToObject(src){
  const out=Object.create(null);
  for(const raw of src.replace(/^\uFEFF/,'').split(/\r?\n/)){
    const line=raw.trim();if(!line||line.startsWith('#'))continue;
    const match=/^([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*(.+)$/.exec(line);
    if(!match)throw Error('Only flat TOML key = value lines are supported.');
    if(Object.hasOwn(out,match[1]))throw Error('Duplicate TOML key: '+match[1]);
    const v=match[2];let parsed;
    if(v.startsWith('"')){parsed=JSON.parse(v);if(typeof parsed!=='string')throw Error('TOML value must be a string.');}
    else if(v.startsWith("'")){if(!v.endsWith("'"))throw Error('Invalid TOML literal string.');parsed=v.slice(1,-1);if(parsed.includes("'"))throw Error('Complex TOML quoted strings are not supported.');}
    else if(v==='true'||v==='false')parsed=v==='true';
    else if(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(v)){
      parsed=Number(v);if(!Number.isFinite(parsed)||Number.isInteger(parsed)&&!Number.isSafeInteger(parsed))throw Error('Unsafe TOML number.');
    }else throw Error('Unsupported TOML value: '+v);
    Object.defineProperty(out,match[1],{value:parsed,enumerable:true,configurable:true,writable:true});
  }
  return out;
}
const toYaml = value => Object.entries(flat(value)).map(([key,v])=>key+': '+scalar(v)).join('\n');
function htmlToMarkdown(src){
  const doc=new DOMParser().parseFromString(src,'text/html');
  const visit=node=>{
    if(node.nodeType===3)return node.nodeValue||'';
    if(node.nodeType!==1)return '';
    const tag=node.nodeName.toLowerCase();
    if(['script','style','template','noscript','svg'].includes(tag))return '';
    const children=()=>Array.from(node.childNodes).map(visit).join('');
    if(/^h[1-6]$/.test(tag))return '\n'+'#'.repeat(Number(tag[1]))+' '+children().trim()+'\n';
    if(tag==='strong'||tag==='b')return '**'+children()+'**';
    if(tag==='em'||tag==='i')return '*'+children()+'*';
    if(tag==='code')return node.parentElement?.nodeName.toLowerCase()==='pre'?children():String.fromCharCode(96)+children()+String.fromCharCode(96);
    if(tag==='pre')return '\n~~~\n'+(node.textContent||'')+'\n~~~\n';
    if(tag==='br')return '\n';
    if(tag==='a'){const href=node.getAttribute('href')||'';return /^https?:\/\/[^\s<>"]+$/i.test(href)?'['+children()+']('+href+')':children();}
    if(tag==='li')return '- '+children().trim()+'\n';
    if(['p','div','ul','ol','section'].includes(tag))return '\n'+children()+'\n';
    if(tag==='blockquote')return '\n'+children().trim().split('\n').map(s=>'> '+s).join('\n')+'\n';
    return children();
  };
  return visit(doc.body).replace(/\n{3,}/g,'\n\n').trim();
}
const plainToHtml = text => '<pre>'+xmlEscape(text)+'</pre>';
function htmlTableToCsv(src){
  const doc=new DOMParser().parseFromString(src,'text/html');
  const tables=doc.querySelectorAll('table');
  if(tables.length!==1)throw Error('Supply exactly one HTML table.');
  if(tables[0].querySelector('script,style'))throw Error('Scripts and styles in table cells are not supported.');
  const rows=Array.from(tables[0].querySelectorAll('tr')).map(tr=>{
    const cells=Array.from(tr.children);
    if(cells.some(c=>!['TH','TD'].includes(c.tagName)))throw Error('Unexpected element inside table row.');
    return cells.map(cell=>{
      if(cell.hasAttribute('rowspan')||cell.hasAttribute('colspan'))throw Error('Merged cells are not supported.');
      const clone=cell.cloneNode(true);clone.querySelectorAll('br').forEach(b=>b.replaceWith('\n'));
      return clone.textContent||'';
    });
  });
  if(!rows.length||!rows[0].length||rows.some(r=>r.length!==rows[0].length))throw Error('HTML table rows must all have the same number of cells.');
  return writeCsv(rows);
}
function jsonToIni(src){
  const obj=object(src),lines=[];
  const write=(key,value)=>{
    if(!identifier.test(key))throw Error('Invalid INI key: '+key);
    if(value===null||typeof value==='object'||typeof value==='undefined')throw Error('INI does not support null or arrays.');
    const text=String(value);
    if(!text||text.trim()!==text||/[\r\n]/.test(text))throw Error('INI cannot preserve blank, padded or multiline values.');
    return key+'='+text;
  };
  for(const [k,v] of Object.entries(obj))if(v===null||typeof v!=='object')lines.push(write(k,v));
  for(const [name,section] of Object.entries(obj)){
    if(section!==null&&typeof section==='object'){
      if(Array.isArray(section)||!identifier.test(name))throw Error('INI sections require simple object keys.');
      lines.push('['+name+']');
      for(const [key,value] of Object.entries(section))lines.push(write(key,value));
      lines.push('');
    }
  }
  return lines.join('\n').trim();
}
function csvToXml(src){
  const rows=parseCsv(src),header=rows.shift();
  if(!rows.length)throw Error('CSV must include at least one data row.');
  if(new Set(header).size!==header.length)throw Error('Duplicate CSV column names are unsupported.');
  if(header.some(key=>!/^[A-Za-z_][\w.-]*$/.test(key)))throw Error('CSV headings must be valid basic XML element names.');
  for(const cell of rows.flat())ensureXmlChars(cell);
  return '<rows>\n'+rows.map(row=>'  <row>'+row.map((value,i)=>'<'+header[i]+'>'+xmlEscape(value)+'</'+header[i]+'>').join('')+'</row>').join('\n')+'\n</rows>';
}
const verifyHeader=(rows,names)=>{
  const headers=rows.shift().map(h=>h.trim().toLowerCase());
  if(headers.length!==names.length||new Set(headers).size!==headers.length||!names.every(name=>headers.includes(name.toLowerCase())))throw Error('Required CSV headings: '+names.join(', ')+'.');
  if(!rows.length)throw Error('CSV must contain at least one data row.');
  return {headers,rows};
};
const escapeText = value => String(value).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
function foldLine(line){
  const encoder=new TextEncoder();let width=0,result='';
  for(const char of line){
    const bytes=encoder.encode(char).length;
    if(width+bytes>75){result+='\r\n ';width=1;}
    result+=char;width+=bytes;
  }
  return result;
}
const outputLines=lines=>lines.map(foldLine).join('\r\n')+'\r\n';
function csvToVcf(src){
  const names=['Name','Email','Phone','Organization'];
  const {headers,rows}=verifyHeader(parseCsv(src),names);
  const col=(r,name)=>r[headers.indexOf(name.toLowerCase())];
  const lines=[];
  for(const row of rows){
    if(!col(row,'Name'))throw Error('Every vCard needs a Name.');
    lines.push('BEGIN:VCARD','VERSION:3.0','FN:'+escapeText(col(row,'Name')));
    for(const [name,key] of [['Email','EMAIL'],['Phone','TEL'],['Organization','ORG']]){
      const value=col(row,name);if(value)lines.push(key+':'+escapeText(value));
    }
    lines.push('END:VCARD');
  }
  return outputLines(lines);
}
function csvToIcs(src){
  const names=['UID','DTSTART','DTEND','SUMMARY','LOCATION','DESCRIPTION'];
  const {headers,rows}=verifyHeader(parseCsv(src),names);
  const col=(r,name)=>r[headers.indexOf(name.toLowerCase())];
  const validDate=x=>{
    if(!/^\d{8}T\d{6}Z$/.test(x))throw Error('Calendar dates must be UTC YYYYMMDDTHHMMSSZ.');
    const year=+x.slice(0,4),month=+x.slice(4,6),day=+x.slice(6,8);
    const hour=+x.slice(9,11),minute=+x.slice(11,13),second=+x.slice(13,15);
    const date=new Date(Date.UTC(year,month-1,day,hour,minute,second));
    if(date.getUTCFullYear()!==year||date.getUTCMonth()+1!==month||date.getUTCDate()!==day||date.getUTCHours()!==hour||date.getUTCMinutes()!==minute||date.getUTCSeconds()!==second)throw Error('Invalid UTC calendar date.');
  };
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ConvertAnyFile//FormatConverter//EN'];
  for(const row of rows){
    const uid=col(row,'UID'),start=col(row,'DTSTART'),end=col(row,'DTEND'),summary=col(row,'SUMMARY');
    if(!uid||!start||!summary)throw Error('Each event needs UID, DTSTART and SUMMARY.');
    if(/[\r\n]/.test(uid))throw Error('UID must be one line.');
    validDate(start);if(end)validDate(end);
    lines.push('BEGIN:VEVENT','UID:'+escapeText(uid),'DTSTART:'+start);
    if(end)lines.push('DTEND:'+end);
    lines.push('SUMMARY:'+escapeText(summary));
    for(const name of ['LOCATION','DESCRIPTION'])if(col(row,name))lines.push(name+':'+escapeText(col(row,name)));
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return outputLines(lines);
}
export function convertReverse(id,input){
  switch(id){
    case 'markdown-html':return {text:htmlToMarkdown(input),ext:'md'};
    case 'html-plain-text':return {text:plainToHtml(input),ext:'html'};
    case 'csv-html-table':return {text:htmlTableToCsv(input),ext:'csv'};
    case 'ini-json':return {text:jsonToIni(input),ext:'ini'};
    case 'json-yaml':return {text:JSON.stringify(yamlToObject(input),null,2),ext:'json'};
    case 'json-toml':return {text:JSON.stringify(tomlToObject(input),null,2),ext:'json'};
    case 'yaml-toml':return {text:toYaml(tomlToObject(input)),ext:'yaml'};
    case 'xml-csv':return {text:csvToXml(input),ext:'xml'};
    case 'vcf-csv':return {text:csvToVcf(input),ext:'vcf'};
    case 'ics-csv':return {text:csvToIcs(input),ext:'ics'};
    default:throw Error('Unknown format converter.');
  }
}
