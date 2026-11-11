const invalidXml=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/u;
function safeText(value:string):string{
 if(invalidXml.test(value)||/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value))
  throw new Error('Text contains characters not allowed in XML 1.0.');
 return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
}
export function jsonToTypedXml(value:unknown):string{
 const walk=(v:unknown,depth:number):string=>{
  if(depth>64)throw new Error('JSON nesting exceeds XML safety limit (64).');
  if(v===null)return '<data type="null"/>';
  if(typeof v==='boolean')return '<data type="boolean">'+v+'</data>';
  if(typeof v==='string')return '<data type="string">'+safeText(v)+'</data>';
  if(typeof v==='number'){
   if(!Number.isFinite(v))throw new Error('Cannot encode a non-finite JSON number.');
   return '<data type="number">'+v+'</data>';
  }
  if(Array.isArray(v))return '<data type="array">'+v.map(item=>'<item>'+walk(item,depth+1)+'</item>').join('')+'</data>';
  if(typeof v==='object'){
   return '<data type="object">'+Object.entries(v).map(([key,item])=>'<entry key="'+safeText(key)+'">'+walk(item,depth+1)+'</entry>').join('')+'</data>';
  }
  throw new Error('Unsupported JSON type for XML.');
 };
 return '<?xml version="1.0" encoding="UTF-8"?>\n'+walk(value,0);
}
const elementChildren=(element:Element):Element[]=>Array.from(element.children);
function typedNode(node:Element,depth:number):unknown{
 if(depth>64)throw new Error('XML nesting exceeds the safety limit.');
 if(node.localName!=='data')throw new Error('Invalid typed JSON-XML node.');
 const children=elementChildren(node);
 const kind=node.getAttribute('type');
 switch(kind){
  case 'null':if(children.length||node.textContent?.trim())throw new Error('Invalid null XML node.');return null;
  case 'boolean':if(children.length||!['true','false'].includes(node.textContent??''))throw new Error('Invalid boolean XML node.');return node.textContent==='true';
  case 'number':{
   if(children.length)throw new Error('Invalid number XML node.');
   const text=node.textContent?.trim()??'';
   if(!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(text))throw new Error('Invalid number XML node.');
   const v=Number(text);
   if(!Number.isFinite(v)||Math.abs(v)>Number.MAX_SAFE_INTEGER)throw new Error('Unsafe XML number; use a string value.');
   return v;
  }
  case 'string':if(children.length)throw new Error('Invalid string XML node.');return node.textContent??'';
  case 'array':
   if(children.some(item=>item.localName!=='item'))throw new Error('Invalid array element in typed XML.');
   return children.map(item=>{
    const children=elementChildren(item);
    if(children.length!==1||children[0]!.localName!=='data')throw new Error('Invalid array item in typed XML.');
    return typedNode(children[0]!,depth+1);
   });
  case 'object':{
   const output:Record<string,unknown>=Object.create(null);
   for(const item of children){
    if(item.localName!=='entry'||!item.hasAttribute('key'))throw new Error('Invalid object entry in typed XML.');
    const key=item.getAttribute('key')!;
    if(Object.prototype.hasOwnProperty.call(output,key))throw new Error('Duplicate typed XML property: '+key);
    const data=elementChildren(item);
    if(data.length!==1||data[0]!.localName!=='data')throw new Error('Invalid XML object value.');
    output[key]=typedNode(data[0]!,depth+1);
   }
   return output;
  }
  default:throw new Error('Unsupported typed XML value: '+kind);
 }
}
function normalElement(node:Element,depth:number):unknown{
 if(depth>64)throw new Error('XML nesting exceeds the safety limit.');
 const children=elementChildren(node);
 const attrs=Array.from(node.attributes);
 const visibleText=Array.from(node.childNodes).filter(item=>item.nodeType===3||item.nodeType===4).map(item=>item.textContent??'').join('');
 if(!children.length&&!attrs.length)return visibleText;
 const result:Record<string,unknown>=Object.create(null);
 for(const attr of attrs)result['@'+attr.name]=attr.value;
 if(visibleText.trim())result['#text']=visibleText.trim();
 for(const child of children){
  const name=child.tagName;
  const value=normalElement(child,depth+1);
  if(Object.prototype.hasOwnProperty.call(result,name)){
   const prev=result[name];
   result[name]=Array.isArray(prev)?[...prev,value]:[prev,value];
  }else result[name]=value;
 }
 return result;
}
export function xmlToJson(xml:string):unknown{
 if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml))throw new Error('DTD and custom entities are not allowed for security.');
 if(typeof DOMParser==='undefined')throw new Error('XML parsing requires a modern browser.');
 const doc=new DOMParser().parseFromString(xml,'application/xml');
 if(doc.getElementsByTagName('parsererror').length)throw new Error('Invalid XML: check tags, quotes and entity syntax.');
 const root=doc.documentElement;
 if(!root)throw new Error('No XML root element.');
 if(root.tagName==='data'&&root.hasAttribute('type'))return typedNode(root,0);
 const output:Record<string,unknown>=Object.create(null);
 output[root.tagName]=normalElement(root,0);
 return output;
}
