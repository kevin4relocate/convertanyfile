export const CONVERSIONS = [
 {id:'markdown-html',name:'Markdown to HTML',input:'Markdown',output:'HTML',example:'# Hello\n\nThis is **bold**.',note:'Supports headings, paragraphs, emphasis and unordered lists. Not a full CommonMark implementation.'},
 {id:'html-plain-text',name:'HTML to Plain Text',input:'HTML',output:'TXT',example:'<h1>Hello</h1><p>A <strong>simple</strong> example.</p>',note:'Removes styles and scripts; layout and formatting are not preserved.'},
 {id:'csv-html-table',name:'CSV to HTML Table',input:'CSV',output:'HTML',example:'name,city\nAlice,Hanoi\nBob,Tokyo',note:'The first CSV row is used as the header. Supports quoted fields and embedded newlines.'},
 {id:'ini-json',name:'INI to JSON',input:'INI',output:'JSON',example:'[server]\nhost=localhost\nport=8080',note:'INI values are kept as strings; duplicate section names and keys are rejected.'}
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
export function convertSimple(id,input){
 if(typeof input!=='string'||!input.trim())throw Error('Enter source text.');
 if(input.length>500000)throw Error('Input exceeds 500,000 characters.');
 switch(id){
 case 'markdown-html':return {text:markdown(input),ext:'html'};
 case 'html-plain-text':return {text:htmlPlain(input),ext:'txt'};
 case 'csv-html-table':return {text:csvHtml(input),ext:'html'};
 case 'ini-json':return {text:iniJson(input),ext:'json'};
 default:throw Error('Unknown converter.');
 }
}
