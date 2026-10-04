// Bounded standard JSON parsing plus a structural duplicate-name scan.
// No claim extraction through regular expressions and no caller object getters.
export function parseUniqueJson(text: string, maxBytes: number): unknown {
  if(typeof text!=='string' || Buffer.byteLength(text)>maxBytes)throw Error('FORMAT');
  const parsed: unknown=JSON.parse(text);
  let pos=0,nodes=0;
  const space=()=>{while(pos<text.length && /[\x20\t\r\n]/.test(text[pos]))pos++;};
  function string(): string {
    const start=pos++;
    while(pos<text.length) {
      const ch=text[pos++];
      if(ch==='\\') {pos++;continue;}
      if(ch==='"')return JSON.parse(text.slice(start,pos));
    }
    throw Error('FORMAT');
  }
  function value(depth: number): void {
    if(depth>6 || ++nodes>256)throw Error('FORMAT');
    space();const ch=text[pos];
    if(ch==='"'){string();return;}
    if(ch==='{' || ch==='[') {
      pos++;space();const end=ch==='{'?'}':']',names=new Set<string>();
      if(text[pos]===end){pos++;return;}
      while(pos<text.length) {
        space();
        if(ch==='{') {
          if(text[pos]!=='"')throw Error('FORMAT');
          const name=string();if(names.has(name))throw Error('FORMAT');names.add(name);
          space();if(text[pos++]!==':')throw Error('FORMAT');
        }
        value(depth+1);space();
        if(text[pos]===end){pos++;return;}
        if(text[pos++]!==',')throw Error('FORMAT');
      }
      throw Error('FORMAT');
    }
    const start=pos;while(pos<text.length && !/[\x20\t\r\n,}\]]/.test(text[pos]))pos++;
    if(pos===start)throw Error('FORMAT');
  }
  value(0);space();if(pos!==text.length)throw Error('FORMAT');return parsed;
}
export function plainRecord(value: unknown): value is Record<string,unknown> {
  if(!value || typeof value!=='object' || Object.getPrototypeOf(value)!==Object.prototype)return false;
  const keys=Reflect.ownKeys(value);
  return keys.length<=16 && keys.every(key=>typeof key==='string' && (()=>{
    const d=Object.getOwnPropertyDescriptor(value,key);return !!d && 'value' in d && d.enumerable;
  })());
}
export function exactRecord(value: unknown, fields: readonly string[]): value is Record<string,unknown> {
  return plainRecord(value) && Object.keys(value).length===fields.length && fields.every(k=>Object.hasOwn(value,k));
}
export function base64url(text: unknown, maxBytes: number): Buffer {
  if(typeof text!=='string' || text.length===0 || text.length>Math.ceil(maxBytes*4/3) || !/^[A-Za-z0-9_-]+$/.test(text))throw Error('FORMAT');
  const bytes=Buffer.from(text,'base64url');
  if(bytes.length>maxBytes || bytes.toString('base64url')!==text)throw Error('FORMAT');return bytes;
}
export function keySet(text: string): Record<string,unknown>[] {
  const doc=parseUniqueJson(text,32768);
  if(!exactRecord(doc,['keys']) || !Array.isArray(doc.keys) || doc.keys.length<1 || doc.keys.length>8)throw Error('KEYS');
  const seen=new Set<string>();
  for(const key of doc.keys) {
    if(!exactRecord(key,['kty','use','alg','kid','n','e']) || key.kty!=='RSA' || key.use!=='sig' || key.alg!=='RS256'
      || typeof key.kid!=='string' || !/^[A-Za-z0-9_-]{1,128}$/.test(key.kid) || seen.has(key.kid))throw Error('KEYS');
    const n=base64url(key.n,512),e=base64url(key.e,3);
    if(n.length<256 || n[0]<128 || !(n.at(-1)!&1) || e.toString('hex')!=='010001')throw Error('KEYS');
    seen.add(key.kid);
  }
  return doc.keys;
}
