import {parseDelimited,quoteCell} from '../../engines/data/codec';

export interface CsvTable{columns:string[];rows:string[][]}
const MAX_ROWS=20000,MAX_COLS=200,MAX_INPUT_CHARS=2_000_000;
export function parseCsv(text:string):CsvTable{
 if(text.length>MAX_INPUT_CHARS)throw new Error('CSV input exceeds 2,000,000 characters.');
 const raw=text.charCodeAt(0)===0xFEFF?text.slice(1):text;
 if(!raw.trim())throw new Error('Enter CSV with at least one header row.');
 const parsed=parseDelimited(raw,',');
 if(parsed.length>MAX_ROWS+1)throw new Error('CSV exceeds 20,000 data rows.');
 const width=Math.max(...parsed.map(row=>row.length));
 if(width>MAX_COLS)throw new Error('CSV exceeds 200 columns.');
 const first=parsed[0]??[];
 if(first.length===1&&!first[0]?.trim()&&parsed.length===1)throw new Error('CSV has no usable header.');
 const used=new Set<string>(), columns:string[]=[];
 for(let i=0;i<width;i++){
  const original=first[i]?.trim()||'column_'+(i+1);
  let name=original,num=2;
  while(used.has(name))name=original+'_'+num++;
  used.add(name);columns.push(name);
 }
 const rows=parsed.slice(1).map(r=>columns.map((_,i)=>r[i]??''));
 return {columns,rows};
}
export function csvString(table:CsvTable):string{
 if(!table.columns.length)throw new Error('Cannot create a CSV without columns.');
 const all=[table.columns,...table.rows];
 return all.map(row=>row.map(cell=>quoteCell(cell,',')).join(',')).join('\n');
}
function fieldNames(text:string):string[]{
 const source=text.trim();
 if(!source)return [];
 const rows=parseDelimited(source,',');
 if(rows.length!==1)throw new Error('Column list must fit on one line.');
 return rows[0]!.map(x=>x.trim()).filter(Boolean);
}
function columnsFromNames(table:CsvTable,input:string,requireInput=true):number[]{
 const names=fieldNames(input);
 if(requireInput&&!names.length)throw new Error('Enter at least one column name.');
 const used=new Set<string>();
 return names.map(name=>{
  if(used.has(name))throw new Error('Repeated column name: '+name);
  used.add(name);
  const idx=table.columns.indexOf(name);
  if(idx<0)throw new Error('Unknown CSV column: '+name);
  return idx;
 });
}
function colIndex(table:CsvTable,name:string):number{
 const index=table.columns.indexOf(name.trim());
 if(index<0)throw new Error('Unknown CSV column: '+name);
 return index;
}
export type CsvOptions=Record<string,string>;
export interface CsvResult{text:string;files?:{name:string;content:string}[]}
const result=(table:CsvTable):CsvResult=>({text:csvString(table)});
export function sortCsv(text:string,options:CsvOptions):CsvResult{
 const table=parseCsv(text), index=colIndex(table,options.column||table.columns[0]!);
 const sign=options.direction==='desc'?-1:1;
 const collator=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
 const rows=table.rows.map((row,i)=>({row,i}));
 rows.sort((a,b)=>{
  const left=a.row[index]!,right=b.row[index]!;
  const v=collator.compare(left,right);
  return v===0?a.i-b.i:sign*v;
 });
 return result({...table,rows:rows.map(x=>x.row)});
}
export function filterCsv(text:string,options:CsvOptions):CsvResult{
 const table=parseCsv(text),idx=colIndex(table,options.column||table.columns[0]!);
 const match=(options.value||'').toLocaleLowerCase();
 const op=options.operator||'contains';
 const check=(cell:string)=>{
  const value=cell.toLocaleLowerCase();
  switch(op){
   case 'contains':return value.includes(match);
   case 'equals':return value===match;
   case 'not-equals':return value!==match;
   case 'starts':return value.startsWith(match);
   case 'ends':return value.endsWith(match);
   case 'empty':return cell.trim()==='';
   case 'not-empty':return cell.trim()!=='';
   default:throw new Error('Unknown filter operator.');
  }
 };
 return result({...table,rows:table.rows.filter(row=>check(row[idx]!))});
}
export function dedupeCsv(text:string,options:CsvOptions):CsvResult{
 const table=parseCsv(text), keys=columnsFromNames(table,options.columns||'',false);
 const selected=keys.length?keys:table.columns.map((_,index)=>index);
 const seen=new Set<string>();
 const rows=table.rows.filter(row=>{
  const key=JSON.stringify(selected.map(i=>row[i]));
  if(seen.has(key))return false;
  seen.add(key);return true;
 });
 return result({...table,rows});
}
export function mergeCsv(primary:string,secondary:string,options:CsvOptions):CsvResult{
 const first=parseCsv(primary),second=parseCsv(secondary);
 const strict=options.mode==='strict';
 if(strict&&JSON.stringify(first.columns)!==JSON.stringify(second.columns))
  throw new Error('Strict mode requires exactly matching CSV headers in the same order.');
 const columns=strict?first.columns:[...new Set([...first.columns,...second.columns])];
 if(columns.length>MAX_COLS)throw new Error('Merged CSV exceeds 200 columns.');
 const map=(table:CsvTable)=>table.rows.map(row=>columns.map(c=>{const index=table.columns.indexOf(c);return index>=0?row[index]! :'';}));
 const rows=[...map(first),...map(second)];
 if(rows.length>MAX_ROWS)throw new Error('Merged CSV exceeds 20,000 rows.');
 return result({columns,rows});
}
export function splitCsv(text:string,options:CsvOptions):CsvResult{
 const table=parseCsv(text);
 const n=Number(options.rows||'1000');
 if(!Number.isInteger(n)||n<1||n>20000)throw new Error('Rows per file must be an integer from 1 to 20000.');
 if(!table.rows.length)throw new Error('Cannot split CSV with no data rows.');
 const count=Math.ceil(table.rows.length/n);
 if(count>100)throw new Error('Split would create more than 100 files. Increase rows per file.');
 const files=Array.from({length:count},(_,i)=>({
  name:'part-'+String(i+1).padStart(3,'0')+'.csv',
  content:csvString({columns:table.columns,rows:table.rows.slice(i*n,(i+1)*n)}),
 }));
 return {text:'Created '+count+' CSV part(s), '+table.rows.length+' data row(s) total.\n'+files.map(x=>x.name).join('\n'),files};
}
export function selectCsvColumns(text:string,options:CsvOptions):CsvResult{
 const table=parseCsv(text),indices=columnsFromNames(table,options.columns||'');
 return result({columns:indices.map(i=>table.columns[i]!),rows:table.rows.map(row=>indices.map(i=>row[i]!))});
}
export function reorderCsvColumns(text:string,options:CsvOptions):CsvResult{
 const table=parseCsv(text),selected=columnsFromNames(table,options.columns||'');
 const indices=[...selected,...table.columns.map((_,i)=>i).filter(i=>!selected.includes(i))];
 return result({columns:indices.map(i=>table.columns[i]!),rows:table.rows.map(row=>indices.map(i=>row[i]!))});
}
export function findReplaceCsv(text:string,options:CsvOptions):CsvResult{
 const table=parseCsv(text);
 const find=options.find??'';
 if(!find)throw new Error('Find text must not be empty.');
 const indices=columnsFromNames(table,options.columns||'',false);
 const selected=indices.length?indices:table.columns.map((_,i)=>i);
 return result({...table,rows:table.rows.map(row=>row.map((cell,i)=>selected.includes(i)?cell.replaceAll(find,options.replace??''):cell))});
}
function sqlIdentifier(value:string):string{
 if(!value||value.length>128||value.includes('\0'))throw new Error('SQL identifier must contain 1 to 128 characters.');
 return '"'+value.replaceAll('"','""')+'"';
}
export function csvToSql(text:string,options:CsvOptions):CsvResult{
 const table=parseCsv(text);
 const name=options.table?.trim()||'imported_rows';
 if(!/^[A-Za-z_][A-Za-z_0-9]{0,127}$/.test(name))throw new Error('Table name must use letters, digits and underscores, starting with a letter or underscore.');
 if(!table.rows.length)throw new Error('CSV has no data rows to create INSERT statements.');
 const cols=table.columns.map(sqlIdentifier).join(', ');
 const lines=table.rows.map(row=>{
  const values=row.map(value=>"'"+value.replaceAll("'","''")+"'").join(', ');
  return 'INSERT INTO '+sqlIdentifier(name)+' ('+cols+') VALUES ('+values+');';
 });
 return {text:lines.join('\n')};
}
type Token={type:'word'|'ident'|'literal'|'number'|'symbol';value:string};
function tokenizeSql(sql:string):Token[]{
 if(sql.length>MAX_INPUT_CHARS)throw new Error('SQL input is too large.');
 const tokens:Token[]=[];
 let i=0;
 while(i<sql.length){
  if(/\s/.test(sql[i]!)){i++;continue;}
  if(tokens.length>400_000)throw new Error('Too many SQL tokens.');
  const char=sql[i]!;
  if(char==="'"||char==='"'){
   const endQuote=char;let val='';i++;
   let closed=false;
   while(i<sql.length){
    if(sql[i]===endQuote){
     if(sql[i+1]===endQuote){val+=endQuote;i+=2;continue;}
     i++;closed=true;break;
    }
    val+=sql[i++]!;
   }
   if(!closed)throw new Error('Unterminated SQL quoted string or identifier.');
   tokens.push({type:char==="'"?'literal':'ident',value:val});continue;
  }
  if(',();.'.includes(char)){tokens.push({type:'symbol',value:char});i++;continue;}
  const number=/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(sql.slice(i));
  if(number){tokens.push({type:'number',value:number[0]});i+=number[0].length;continue;}
  const word=/^[a-zA-Z_][a-zA-Z_\d]*/.exec(sql.slice(i));
  if(word){tokens.push({type:'word',value:word[0]});i+=word[0].length;continue;}
  throw new Error('Unsupported SQL syntax near position '+i+'. Only literal INSERT VALUES are accepted.');
 }
 return tokens;
}
export function sqlToCsv(sql:string):CsvResult{
 const tokens=tokenizeSql(sql);
 let p=0,firstColumns:string[]|undefined,firstTable:string|undefined;
 const rows:string[][]=[];
 const peek=()=>tokens[p];
 const take=(type?:Token['type'],value?:string):Token=>{
  const token=tokens[p++];
  if(!token||(type&&token.type!==type)||(value&&token.value.toUpperCase()!==value.toUpperCase()))
   throw new Error('Expected '+(value||type||'SQL token')+' near token '+p+'.');
  return token;
 };
 const name=():string=>{const t=peek();if(!t||!['ident','word'].includes(t.type))throw new Error('Expected SQL identifier.');p++;return t.value};
 const symbol=(value:string)=>take('symbol',value);
 const keyword=(value:string)=>take('word',value);
 if(!tokens.length)throw new Error('Enter SQL INSERT statements.');
 while(p<tokens.length){
  keyword('INSERT');keyword('INTO');
  let table=name();
  if(peek()?.value==='.') {symbol('.');table+='.'+name();}
  symbol('(');
  const columns=[name()];
  while(peek()?.value===','){symbol(',');columns.push(name());}
  symbol(')');
  if(columns.length>MAX_COLS)throw new Error('Too many SQL columns.');
  if(new Set(columns).size!==columns.length)throw new Error('Duplicate SQL INSERT columns.');
  if(firstColumns){
   if(table!==firstTable||JSON.stringify(columns)!==JSON.stringify(firstColumns))
    throw new Error('All INSERT statements must target the same table and columns in the same order.');
  }else{firstColumns=columns;firstTable=table;}
  keyword('VALUES');
  do{
   symbol('(');
   const fields:string[]=[];
   do{
    const token=peek();
    if(!token)throw new Error('Incomplete SQL VALUES row.');
    if(token.type==='literal'||token.type==='number'){fields.push(token.value);p++;}
    else if(token.type==='word'&&['NULL','TRUE','FALSE'].includes(token.value.toUpperCase())){
     fields.push(token.value.toUpperCase()==='NULL'?'':token.value.toLowerCase());p++;
    } else throw new Error('SQL expressions and functions are not supported; use literal values.');
    if(peek()?.value!==',')break;
    symbol(',');
   }while(true);
   symbol(')');
   if(fields.length!==columns.length)throw new Error('SQL VALUES field count does not match column count.');
   rows.push(fields);
   if(rows.length>MAX_ROWS)throw new Error('SQL exceeds 20,000 rows.');
   if(peek()?.value!==',')break;
   symbol(',');
  }while(true);
  if(peek()?.value===';')symbol(';');
  else if(p<tokens.length)throw new Error('SQL INSERT statements must be separated by semicolons.');
 }
 return result({columns:firstColumns!,rows});
}
export function profileCsv(text:string):CsvResult{
 const table=parseCsv(text);
 const report:string[]=['CSV DATA PROFILE','Rows: '+table.rows.length,'Columns: '+table.columns.length,''];
 for(let c=0;c<table.columns.length;c++){
  const values=table.rows.map(row=>row[c]??'');
  const nonempty=values.filter(value=>value.trim()!=='');
  const unique=new Set(values);
  const numbers=nonempty.filter(value=>/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)&&Number.isFinite(Number(value))&&value.length<=16).map(Number);
  report.push('Column: '+table.columns[c],
   '  Empty cells: '+(values.length-nonempty.length),
   '  Non-empty cells: '+nonempty.length,
   '  Unique raw values: '+unique.size,
   '  Numeric-looking cells: '+numbers.length,
   '  Min/Max length: '+(values.length?Math.min(...values.map(v=>[...v].length)):0)+' / '+(values.length?Math.max(...values.map(v=>[...v].length)):0),
   '  Examples: '+[...new Set(nonempty)].slice(0,3).map(x=>JSON.stringify(x.slice(0,80))).join(', '));
  if(numbers.length)report.push('  Numeric min/max: '+Math.min(...numbers)+' / '+Math.max(...numbers));
  report.push('');
 }
 return {text:report.join('\n')};
}
