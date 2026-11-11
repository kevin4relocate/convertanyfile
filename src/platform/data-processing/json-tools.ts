type JSONSchema = boolean | Record<string, unknown>;
type Issue = string;
const own = (obj:object,key:string):boolean => Object.prototype.hasOwnProperty.call(obj,key);
const isObject=(v:unknown):v is Record<string,unknown> => typeof v==='object'&&v!==null&&!Array.isArray(v);
const same=(a:unknown,b:unknown):boolean => JSON.stringify(a)===JSON.stringify(b);
const showPath=(p:string,k:string)=>p+'['+JSON.stringify(k)+']';
const NUMERIC_KEYS=['minimum','maximum','exclusiveMinimum','exclusiveMaximum','multipleOf','minLength','maxLength','minItems','maxItems','minProperties','maxProperties'] as const;
const VALID_TYPES=new Set(['string','number','integer','object','array','boolean','null']);
const MAX_ERRORS=35;

function schemaAsRecord(s:unknown):Record<string,unknown>|undefined{
 if(!isObject(s))return;
 return s;
}
function assertSchema(value:unknown,level=0):void{
 if(level>48)throw new Error('JSON Schema exceeds the nesting safety limit.');
 if(typeof value==='boolean')return;
 if(!isObject(value))throw new Error('JSON Schema must be an object or boolean.');
 const type=value.type;
 if(type!==undefined){
  const types=Array.isArray(type)?type:[type];
  if(!types.length||!types.every(t=>typeof t==='string'&&VALID_TYPES.has(t)))throw new Error('Unsupported JSON Schema type keyword.');
 }
 for(const key of NUMERIC_KEYS){
  const v=value[key];
  if(v!==undefined&&(!Number.isFinite(v)||typeof v!=='number'||v<0&&key!=='minimum'&&key!=='maximum'&&key!=='exclusiveMinimum'&&key!=='exclusiveMaximum'))throw new Error('Invalid JSON Schema '+key+' keyword.');
 }
 const required=value.required;
 if(required!==undefined&&(!Array.isArray(required)||!required.every(x=>typeof x==='string')))throw new Error('JSON Schema required must be an array of property names.');
 for(const k of ['$ref']){
  if(value[k]!==undefined&&(typeof value[k]!=='string'||!(value[k] as string).startsWith('#/')))
   throw new Error('Only local JSON Schema references (#/...) are supported.');
 }
 for(const key of ['properties','$defs','definitions']){
  const m=value[key];
  if(m!==undefined){
   if(!isObject(m))throw new Error('JSON Schema '+key+' must be an object.');
   for(const sub of Object.values(m))assertSchema(sub,level+1);
  }
 }
 for(const key of ['items','additionalProperties','not']){
  const nested=value[key];
  if(nested!==undefined)assertSchema(nested,level+1);
 }
 for(const key of ['allOf','anyOf','oneOf','prefixItems']){
  const list=value[key];
  if(list!==undefined){
   if(!Array.isArray(list))throw new Error('JSON Schema '+key+' must be an array.');
   for(const s of list)assertSchema(s,level+1);
  }
 }
 if(value.pattern!==undefined&&(typeof value.pattern!=='string'||value.pattern.length>128))
  throw new Error('JSON Schema pattern must be a short regular expression.');
}

function safePattern(pattern:string,text:string):boolean {
 if(text.length>4096)throw new Error('String too long to evaluate against a pattern (maximum 4096 characters).');
 if(/(\([^)]*[+*{][^)]*\))[+*{]|\\[1-9]|\(\?<[!=]/.test(pattern))
  throw new Error('This potentially expensive pattern is unsupported.');
 let re:RegExp;
 try{re=new RegExp(pattern,'u');}catch{throw new Error('Invalid JSON Schema pattern regex.');}
 return re.test(text);
}

function resolveRef(root:Record<string,unknown>,ref:string):unknown{
 const pointer=ref.slice(2).split('/').map(part=>part.replaceAll('~1','/').replaceAll('~0','~'));
 let current:unknown=root;
 for(const key of pointer){
  if(!isObject(current)||!own(current,key))throw new Error('Unresolved local JSON Schema reference: '+ref);
  current=current[key];
 }
 return current;
}
function typeMatches(value:unknown,type:string):boolean{
 switch(type){
  case 'null':return value===null;
  case 'array':return Array.isArray(value);
  case 'object':return isObject(value);
  case 'integer':return typeof value==='number'&&Number.isInteger(value);
  default:return typeof value===type;
 }
}
export function validateCommonJsonSchema(data:unknown,schema:unknown):{valid:boolean;issues:Issue[]} {
 assertSchema(schema);
 if(typeof schema!=='boolean'&&!isObject(schema))throw new Error('Invalid JSON Schema.');
 const root=typeof schema==='boolean'?{}:schema;
 const issues:Issue[]=[];
 const add=(message:string):void=>{if(issues.length<MAX_ERRORS)issues.push(message);};
 const walk=(value:unknown,s:unknown,path:string,depth:number,refs:Set<string>):void=>{
  if(issues.length>=MAX_ERRORS)return;
  if(depth>64){add(path+': schema nesting exceeds 64 levels');return;}
  if(s===true)return;
  if(s===false){add(path+': disallowed by boolean schema');return;}
  if(!isObject(s)){add(path+': invalid schema node');return;}
  if(typeof s.$ref==='string'){
   if(refs.has(s.$ref)){add(path+': recursive $ref detected');return;}
   const next=new Set(refs);next.add(s.$ref);
   walk(value,resolveRef(root,s.$ref),path,depth+1,next);
   return;
  }
  if(s.type!==undefined){
   const all=Array.isArray(s.type)?s.type:[s.type];
   if(!all.some(t=>typeof t==='string'&&typeMatches(value,t))){
    add(path+': expected '+all.join(' or '));return;
   }
  }
  if(s.const!==undefined&&!same(value,s.const))add(path+': does not match const');
  if(Array.isArray(s.enum)&&!s.enum.some(v=>same(v,value)))add(path+': value is not in enum');
  if(typeof value==='string'){
   const length=[...value].length;
   if(typeof s.minLength==='number'&&length<s.minLength)add(path+': shorter than minLength');
   if(typeof s.maxLength==='number'&&length>s.maxLength)add(path+': longer than maxLength');
   if(typeof s.pattern==='string'&&!safePattern(s.pattern,value))add(path+': does not match pattern');
  }
  if(typeof value==='number'){
   if(typeof s.minimum==='number'&&value<s.minimum)add(path+': below minimum');
   if(typeof s.maximum==='number'&&value>s.maximum)add(path+': above maximum');
   if(typeof s.exclusiveMinimum==='number'&&value<=s.exclusiveMinimum)add(path+': below exclusiveMinimum');
   if(typeof s.exclusiveMaximum==='number'&&value>=s.exclusiveMaximum)add(path+': above exclusiveMaximum');
   if(typeof s.multipleOf==='number'&&s.multipleOf>0){
    const quotient=value/s.multipleOf;
    if(Math.abs(quotient-Math.round(quotient))>1e-9)add(path+': not a multipleOf '+s.multipleOf);
   }
  }
  if(Array.isArray(value)){
   if(typeof s.minItems==='number'&&value.length<s.minItems)add(path+': fewer than minItems');
   if(typeof s.maxItems==='number'&&value.length>s.maxItems)add(path+': more than maxItems');
   if(s.uniqueItems===true&&value.some((v,i)=>value.slice(0,i).some(u=>same(u,v))))add(path+': array items must be unique');
   if(Array.isArray(s.prefixItems))s.prefixItems.forEach((sub,i)=>{if(i<value.length)walk(value[i],sub,path+'['+i+']',depth+1,refs)});
   if(s.items!==undefined){
    const start=Array.isArray(s.prefixItems)?s.prefixItems.length:0;
    for(let i=start;i<value.length;i++)walk(value[i],s.items,path+'['+i+']',depth+1,refs);
   }
  }
  if(isObject(value)){
   const keys=Object.keys(value);
   if(typeof s.minProperties==='number'&&keys.length<s.minProperties)add(path+': fewer than minProperties');
   if(typeof s.maxProperties==='number'&&keys.length>s.maxProperties)add(path+': more than maxProperties');
   if(Array.isArray(s.required))for(const k of s.required){
    if(typeof k==='string'&&!own(value,k))add(showPath(path,k)+': required property is missing');
   }
   const properties=schemaAsRecord(s.properties);
   for(const [key,v] of Object.entries(value)){
    if(properties&&own(properties,key))walk(v,properties[key],showPath(path,key),depth+1,refs);
    else if(s.additionalProperties!==undefined)walk(v,s.additionalProperties,showPath(path,key),depth+1,refs);
   }
  }
  for(const key of ['allOf','anyOf','oneOf'] as const){
   if(!Array.isArray(s[key]))continue;
   const list=s[key] as unknown[];
   if(key==='allOf')list.forEach(part=>walk(value,part,path,depth+1,refs));
   else{
    let hits=0;
    for(const part of list){
     const count=issues.length;
     walk(value,part,path,depth+1,refs);
     const match=issues.length===count;
     issues.length=count;
     if(match)hits++;
    }
    if(key==='anyOf'&&hits===0)add(path+': no anyOf alternatives matched');
    if(key==='oneOf'&&hits!==1)add(path+': expected exactly one oneOf match (found '+hits+')');
   }
  }
  if(s.not!==undefined){
   const count=issues.length;
   walk(value,s.not,path,depth+1,refs);
   const matches=issues.length===count;
   issues.length=count;
   if(matches)add(path+': matches forbidden not schema');
  }
 };
 walk(data,schema,'$',0,new Set());
 return {valid:issues.length===0,issues};
}

type PathPart={type:'field'|'index'|'wildcard'|'recursive';value?:string|number};
export function parseSafeJsonPath(expression:string):PathPart[]{
 const text=expression.trim();
 if(!text.startsWith('$'))throw new Error('JSONPath must begin with $.');
 const parts:PathPart[]=[];
 let i=1;
 while(i<text.length){
  if(parts.length>32)throw new Error('JSONPath supports up to 32 steps.');
  if(text[i]==='.'){
   const recursive=text[i+1]==='.';
   i+=recursive?2:1;
   if(text[i]==='*'){parts.push({type:recursive?'recursive':'wildcard',value:'*'});i++;continue;}
   const match=/^[A-Za-z_$][\w$-]*/.exec(text.slice(i));
   if(!match)throw new Error('Invalid JSONPath property near character '+i+'.');
   parts.push({type:recursive?'recursive':'field',value:match[0]});i+=match[0].length;continue;
  }
  if(text[i]==='['){
   const end=text.indexOf(']',i+1);
   if(end<0)throw new Error('JSONPath bracket is not closed.');
   const raw=text.slice(i+1,end).trim();
   if(raw==='*')parts.push({type:'wildcard'});
   else if(/^-?\d+$/.test(raw))parts.push({type:'index',value:Number(raw)});
   else if(raw.startsWith('"')&&raw.endsWith('"')) {
    let key:string;
    try{key=JSON.parse(raw);}catch{throw new Error('Invalid quoted JSONPath property.');}
    if(typeof key!=='string')throw new Error('JSONPath property must be text.');
    parts.push({type:'field',value:key});
   } else if(raw.startsWith("'")&&raw.endsWith("'")&&!raw.slice(1,-1).includes("'"))parts.push({type:'field',value:raw.slice(1,-1)});
   else throw new Error('Unsupported JSONPath bracket syntax. Use ["key"], [index], or [*].');
   i=end+1;continue;
  }
  throw new Error('Unexpected JSONPath character near '+i+'.');
 }
 return parts;
}
export function querySafeJsonPath(value:unknown,expression:string):unknown[]{
 const parts=parseSafeJsonPath(expression);
 let nodes:unknown[]=[value];
 for(const part of parts){
  const next:unknown[]=[];
  const push=(v:unknown)=>{if(next.length>=1000)throw new Error('JSONPath result exceeds 1000 matches. Narrow the query.');next.push(v);};
  const children=(v:unknown)=>Array.isArray(v)?v:isObject(v)?Object.values(v):[];
  const visit=(v:unknown,target:string|number|undefined,level:number):void=>{
   if(level>64)throw new Error('JSONPath traversal depth exceeds 64.');
   if(isObject(v)){
    for(const [k,x] of Object.entries(v)){if(target==='*'||k===target)push(x);visit(x,target,level+1);}
   }else if(Array.isArray(v)){for(const x of v)visit(x,target,level+1);}
  };
  for(const n of nodes){
   switch(part.type){
    case 'field':if(isObject(n)&&own(n,String(part.value)))push(n[String(part.value)]);break;
    case 'index':if(Array.isArray(n)){const idx=Number(part.value)<0?n.length+Number(part.value):Number(part.value);if(idx>=0&&idx<n.length)push(n[idx]);}break;
    case 'wildcard':for(const c of children(n))push(c);break;
    case 'recursive':visit(n,part.value,0);break;
   }
  }
  nodes=next;
 }
 return nodes;
}
