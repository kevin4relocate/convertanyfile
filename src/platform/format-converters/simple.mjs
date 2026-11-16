export const CONVERSIONS = [
 {id:'markdown-html',name:'Markdown to HTML',input:'Markdown',output:'HTML',example:'# Hello\n\nThis is **bold**.',note:'Supports headings, paragraphs, emphasis and unordered lists. Not a full CommonMark implementation.'},
 {id:'html-plain-text',name:'HTML to Plain Text',input:'HTML',output:'TXT',example:'<h1>Hello</h1><p>A <strong>simple</strong> example.</p>',note:'Removes styles and scripts; layout and formatting are not preserved.'},
 {id:'csv-html-table',name:'CSV to HTML Table',input:'CSV',output:'HTML',example:'name,city\nAlice,Hanoi\nBob,Tokyo',note:'The first CSV row is used as the header. Supports quoted fields and embedded newlines.'},
 {id:'ini-json',name:'INI to JSON',input:'INI',output:'JSON',example:'[server]\nhost=localhost\nport=8080',note:'INI values are kept as strings; duplicate section names and keys are rejected.'},
 {id:'json-yaml',name:'JSON to YAML',input:'JSON',output:'YAML',example:'{"title":"Example","enabled":true,"count":3}',note:'Supports JSON objects with flat scalar keys and values. Nested arrays, objects and advanced YAML are not supported.'},
 {id:'json-toml',name:'JSON to TOML',input:'JSON',output:'TOML',example:'{"title":"Example","enabled":true,"count":3}',note:'Supports JSON objects with flat scalar keys and values. Null, dates, arrays, tables and nested objects are not supported.'},
 {id:'yaml-toml',name:'YAML to TOML',input:'YAML',output:'TOML',example:'title: Example\nenabled: true\ncount: 3',note:'Supports simple flat YAML scalar mappings only. Anchors, tags, arrays and nested objects are rejected.'},
 {id:'xml-csv',name:'XML to CSV',input:'XML',output:'CSV',example:'<rows><row><name>Alice</name><city>Hanoi</city></row></rows>',note:'Accepts row elements with flat child elements and no attributes. Mixed or nested XML is unsupported.'},
 {id:'vcf-csv',name:'VCF (vCard) to CSV',input:'VCF',output:'CSV',example:'BEGIN:VCARD\nVERSION:3.0\nFN:Alice Example\nEMAIL:alice@example.com\nEND:VCARD',note:'Exports basic FN, EMAIL, TEL and ORG fields. Additional properties, multiple values, photos and extended attributes are not preserved.'},
 {id:'ics-csv',name:'ICS (Calendar) to CSV',input:'ICS',output:'CSV',example:'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:event-1\nDTSTART:20270101T090000Z\nDTEND:20270101T100000Z\nSUMMARY:Example\nEND:VEVENT\nEND:VCALENDAR',note:'Exports basic UID, DTSTART, DTEND, SUMMARY, LOCATION and DESCRIPTION. Recurrence, custom timezone definitions and attendees are unsupported.'}
];
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function markdown(src){
 const output=[];let list=false;
 const inline=s=>esc(s).replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*\n]+)\*/g,'<em>$1</em>');
 for(const s of src.split(/\r?\n/)){
  const bullet=/^\s*[-*]\s+(.+)$/.exec(s);
  if(bullet){if(!list){output.push('<ul>');list=true;}output.push('<li>'+inline(bullet[1])+'</li>');continue;}
  if(list){output.push('</ul>');list=false;}
  if(!s.trim())continue;
  const head=/^(#{1,6})\s+(.+)$/.exec(s);
  if(head){const n=head[1].length;output.push('<h'+n+'>'+inline(head[2])+'</h'+n+'>');}
  else output.push('<p>'+inline(s)+'</p>');
 }
 if(list)output.push('</ul>');
 return output.join('\n');
}
function htmlPlain(src){
 const doc=new DOMParser().parseFromString(src,'text/html');
 doc.querySelectorAll('script,style,template,noscript').forEach(n=>n.remove());
 doc.querySelectorAll('br').forEach(n=>n.replaceWith('\n'));
 doc.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,tr').forEach(n=>n.append('\n'));
 return (doc.body.textContent||'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
function csvRows(s){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<s.length;i++){const c=s[i];
  if(quoted){if(c==='"'&&s[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}
  else if(c==='"'){if(cell)throw Error('Unexpected CSV quote.');quoted=true;}
  else if(c===','){row.push(cell);cell='';}
  else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell='';}
  else if(c==='\r'&&s[i+1]==='\n'){}else cell+=c;
 }
 if(quoted)throw Error('Unclosed CSV quoted field.');
 if(cell||row.length){row.push(cell);rows.push(row);}
 if(rows.length===0)throw Error('CSV is empty.');
 const columns=rows[0].length;
 if(rows.some(r=>r.length!==columns))throw Error('All CSV rows must have the same number of columns.');
 return rows;
}
function csvHtml(s){
 const rows=csvRows(s);
 const tableRow=(row,tag)=>'<tr>'+row.map(v=>'<'+tag+'>'+esc(v)+'</'+tag+'>').join('')+'</tr>';
 return '<table>\n<thead>'+tableRow(rows[0],'th')+'</thead>\n<tbody>\n'+rows.slice(1).map(r=>tableRow(r,'td')).join('\n')+'\n</tbody>\n</table>';
}
function iniJson(s){
 const root=Object.create(null);let current=root;
 for(const raw of s.split(/\r?\n/)){
  const line=raw.trim();if(!line||line.startsWith(';')||line.startsWith('#'))continue;
  const section=/^\[([^\[\]]+)\]$/.exec(line);
  if(section){const name=section[1];if(Object.hasOwn(root,name))throw Error('Duplicate section '+name);current=Object.create(null);Object.defineProperty(root,name,{value:current,enumerable:true,writable:true,configurable:true});continue;}
  const pair=/^([^=]+?)\s*=\s*(.*)$/.exec(line);
  if(!pair)throw Error('Invalid INI line: '+line);
  const key=pair[1].trim();if(!key||Object.hasOwn(current,key))throw Error('Invalid or duplicate INI key: '+key);
  Object.defineProperty(current,key,{value:pair[2],enumerable:true,writable:true,configurable:true});
 }
 return JSON.stringify(root,null,2);
}

function jsonObject(text){
 const obj=JSON.parse(text);
 if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('A JSON object is required.');
 for(const [key,v] of Object.entries(obj)){
  if(!/^[a-zA-Z_][\w-]*$/.test(key))throw Error('Keys must be simple identifiers.');
  if(v!==null&&typeof v==='object')throw Error('Arrays and nested objects are not supported.');
  if(typeof v==='number'&&!Number.isFinite(v))throw Error('Nonfinite numbers are not supported.');
 }
 return obj;
}
function jsonYaml(text){
 return Object.entries(jsonObject(text)).map(([k,v])=>k+': '+JSON.stringify(v)).join('\n');
}
function tomlScalar(v){
 if(v===null)throw Error('TOML does not have a null value.');
 if(typeof v==='string')return JSON.stringify(v);
 if(typeof v==='boolean'||typeof v==='number')return String(v);
 throw Error('Unsupported TOML value.');
}
function jsonToml(text){
 return Object.entries(jsonObject(text)).map(([k,v])=>k+' = '+tomlScalar(v)).join('\n');
}
function yamlToml(text){
 const object=Object.create(null);
 for(const raw of text.split(/\r?\n/)){
  const line=raw.trim();
  if(!line||line.startsWith('#'))continue;
  if(raw!==line)throw Error('Nested or indented YAML is not supported.');
  const match=/^([A-Za-z_][\w-]*):(?:\s+(.*))?$/.exec(line);
  if(!match)throw Error('Only simple YAML key: value lines are supported.');
  if(Object.hasOwn(object,match[1]))throw Error('Duplicate YAML key: '+match[1]);
  const value=match[2];
  if(value===undefined||value==='')throw Error('Null and nested values are not supported.');
  if(/^[\[{!&*|>]/.test(value))throw Error('Complex YAML values are not supported.');
  let parsed;
  if(value.startsWith('"'))parsed=JSON.parse(value);
  else if(value.startsWith("'")&&value.endsWith("'"))parsed=value.slice(1,-1).replace(/''/g,"'");
  else if(value==='true'||value==='false')parsed=value==='true';
  else if(value==='null'||value==='~')throw Error('TOML cannot represent null.');
  else if(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value))parsed=Number(value);
  else if(/[:#\[\]{}]/.test(value))throw Error('Complex or ambiguous YAML values are not supported.');
  else parsed=value;
  object[match[1]]=parsed;
 }
 return Object.entries(object).map(([k,v])=>k+' = '+tomlScalar(v)).join('\n');
}
function csvSerialize(rows){
 return rows.map(row=>row.map(value=>{
  const v=String(value??'');
  return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;
 }).join(',')).join('\n');
}
function xmlCsv(text){
 if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('DTD and external entities are not supported.');
 const xml=new DOMParser().parseFromString(text,'application/xml');
 if(xml.querySelector('parsererror'))throw Error('Invalid XML.');
 const records=[...xml.documentElement.children];
 if(records.length===0)throw Error('Expected a root with child record elements.');
 const data=records.map(record=>{
  if(record.attributes.length)throw Error('XML attributes cannot be converted by this basic tool.');
  if(record.children.length===0)throw Error('Each record must contain elements.');
  const values=Object.create(null);
  for(const child of record.children){
   if(child.children.length||child.attributes.length)throw Error('Nested elements or attributes are not supported.');
   if(Object.hasOwn(values,child.tagName))throw Error('Duplicate XML field: '+child.tagName);
   values[child.tagName]=child.textContent??'';
  }
  return values;
 });
 const header=[...new Set(data.flatMap(record=>Object.keys(record)))];
 return csvSerialize([header,...data.map(record=>header.map(key=>record[key]??''))]);
}
function unfold(text){return text.replace(/\r\n[ \t]/g,'').replace(/\n[ \t]/g,'');}
function unescapeCalendar(s){return s.replace(/\\n/gi,'\n').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\');}
function vcfCsv(text){
 const blocks=unfold(text).split(/BEGIN:VCARD/i).slice(1);
 if(!blocks.length)throw Error('No vCard blocks found.');
 const fields=['FN','EMAIL','TEL','ORG'];
 const rows=blocks.map(block=>{
  if(!/END:VCARD/i.test(block))throw Error('Unclosed vCard block.');
  const lines=block.split(/\r?\n/);
  return fields.map(key=>{
   const matching=lines.filter(line=>line.toUpperCase().startsWith(key+':'));
   if(matching.length>1)throw Error('Multiple '+key+' values are not supported.');
   return matching.length?unescapeCalendar(matching[0].slice(key.length+1)):'';
  });
 });
 return csvSerialize([['Name','Email','Phone','Organization'],...rows]);
}
function icsCsv(text){
 const blocks=unfold(text).split('BEGIN:VEVENT').slice(1);
 if(!blocks.length)throw Error('No calendar events found.');
 const fields=['UID','DTSTART','DTEND','SUMMARY','LOCATION','DESCRIPTION'];
 const rows=blocks.map(block=>{
  if(!block.includes('END:VEVENT'))throw Error('Unclosed calendar event.');
  if(/(?:^|\n)(?:RRULE|RDATE|EXDATE|ATTENDEE)[;:]/.test(block))throw Error('Recurring events and attendees are not supported.');
  const lines=block.split(/\r?\n/);
  return fields.map(key=>{
   const matching=lines.filter(line=>line.startsWith(key+':'));
   if(matching.length>1)throw Error('Repeated '+key+' is not supported.');
   if(lines.some(line=>line.startsWith(key+';')))throw Error('Parameterized '+key+' is not supported.');
   return matching.length?unescapeCalendar(matching[0].slice(key.length+1)):'';
  });
 });
 return csvSerialize([fields,...rows]);
}

export function convertSimple(id,input){
 if(typeof input!=='string'||!input.trim())throw Error('Enter source text.');
 if(input.length>500000)throw Error('Input exceeds 500,000 characters.');
 switch(id){
 case 'markdown-html':return {text:markdown(input),ext:'html'};
 case 'html-plain-text':return {text:htmlPlain(input),ext:'txt'};
 case 'csv-html-table':return {text:csvHtml(input),ext:'html'};
 case 'ini-json':return {text:iniJson(input),ext:'json'};
 case 'json-yaml':return {text:jsonYaml(input),ext:'yaml'};
 case 'json-toml':return {text:jsonToml(input),ext:'toml'};
 case 'yaml-toml':return {text:yamlToml(input),ext:'toml'};
 case 'xml-csv':return {text:xmlCsv(input),ext:'csv'};
 case 'vcf-csv':return {text:vcfCsv(input),ext:'csv'};
 case 'ics-csv':return {text:icsCsv(input),ext:'csv'};
 default:throw Error('Unknown converter.');
 }
}
