import { assertSafeJsonNumbers } from '../../engines/data/codec';
import { validateCommonJsonSchema, querySafeJsonPath } from './json-tools';
import { jsonToTypedXml, xmlToJson } from './xml-tools';
import {
 sortCsv, filterCsv, dedupeCsv, mergeCsv, splitCsv, selectCsvColumns,
 reorderCsvColumns, findReplaceCsv, csvToSql, sqlToCsv, profileCsv,
 type CsvResult,
} from './csv-tools';

export interface DataRunResult {text:string;filename:string;files?:{name:string;content:string}[]}
export const MAX_DATA_CHARS=2_000_000;
const outputs:Readonly<Record<string,'csv'|'json'|'xml'|'txt'|'sql'|'zip'>>={
 'json-schema-validator':'txt','jsonpath-tester':'json','json-to-xml':'xml','xml-to-json':'json',
 'csv-row-sorter':'csv','csv-row-filter':'csv','csv-duplicate-remover':'csv',
 'csv-file-merger':'csv','csv-file-splitter':'zip','csv-column-selector':'csv',
 'csv-column-reorderer':'csv','csv-find-replace':'csv','csv-to-sql-insert':'sql',
 'sql-insert-to-csv':'csv','csv-data-profiler':'txt',
};
function parseSafeJson(text:string):unknown{
 assertSafeJsonNumbers(text);
 try{return JSON.parse(text) as unknown;}
 catch(error){throw new Error('Invalid JSON: '+(error instanceof Error?error.message:'unable to parse'));}
}
export function runDataProcessing(
 id:string,input:string,options:Record<string,string>={},secondary=''
):DataRunResult{
 const ext=outputs[id];
 if(!ext)throw new Error('Unknown data-processing tool: '+id);
 if(input.length>MAX_DATA_CHARS||secondary.length>MAX_DATA_CHARS)throw new Error('Input exceeds 2,000,000 characters.');
 if(!input.trim())throw new Error('Enter data before processing.');
 let content:CsvResult;
 switch(id){
  case 'json-schema-validator':{
   if(!secondary.trim())throw new Error('Paste a JSON Schema into the second editor.');
   const schema=parseSafeJson(secondary),data=parseSafeJson(input);
   const v=validateCommonJsonSchema(data,schema);
   content={text:v.valid?'Valid: JSON matches the supplied schema.':'Invalid: '+v.issues.length+' issue(s):\n'+v.issues.map((x,i)=>(i+1)+'. '+x).join('\n')};
   break;
  }
  case 'jsonpath-tester':{
   const matches=querySafeJsonPath(parseSafeJson(input),options.path||'$');
   content={text:JSON.stringify(matches,null,2)};
   break;
  }
  case 'json-to-xml':content={text:jsonToTypedXml(parseSafeJson(input))};break;
  case 'xml-to-json':content={text:JSON.stringify(xmlToJson(input),null,2)};break;
  case 'csv-row-sorter':content=sortCsv(input,options);break;
  case 'csv-row-filter':content=filterCsv(input,options);break;
  case 'csv-duplicate-remover':content=dedupeCsv(input,options);break;
  case 'csv-file-merger':{
   if(!secondary.trim())throw new Error('Paste the second CSV file in the second editor.');
   content=mergeCsv(input,secondary,options);break;
  }
  case 'csv-file-splitter':content=splitCsv(input,options);break;
  case 'csv-column-selector':content=selectCsvColumns(input,options);break;
  case 'csv-column-reorderer':content=reorderCsvColumns(input,options);break;
  case 'csv-find-replace':content=findReplaceCsv(input,options);break;
  case 'csv-to-sql-insert':content=csvToSql(input,options);break;
  case 'sql-insert-to-csv':content=sqlToCsv(input);break;
  case 'csv-data-profiler':content=profileCsv(input);break;
  default:throw new Error('Unsupported data tool.');
 }
 if(content.text.length>10_000_000)throw new Error('Generated output is too large (more than 10 million characters).');
 return {text:content.text,files:content.files,filename:id+'-result.'+ext};
}
