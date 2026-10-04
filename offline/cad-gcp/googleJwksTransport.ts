import { request } from 'node:https';
import type { ClientRequest, IncomingMessage } from 'node:http';
import { performance } from 'node:perf_hooks';
import * as identityFormat from './googleIdentityFormat';
const { keySet } = identityFormat;

// Official discovery endpoint recorded in the public OIDC documentation.
// Private constants; caller/token URL and mutable export substitution unsupported.
const host='www.googleapis.com',path='/oauth2/v3/certs';
const totalMs=5000,headerBytes=8192,bodyBytes=32768;
function failure() {return Object.freeze({ok:false as const,code:'GOOGLE_JWKS_UNAVAILABLE' as const,
  googleProvenanceVerified:false as const,hostQualified:false as const,bodyAdmissionAuthorized:false as const,liveReady:false as const});}
type Result=ReturnType<typeof failure>|Readonly<{ok:true;code:'PUBLIC_JWKS_BYTES_ONLY';jwksJson:string;maxAgeMs:number;
  googleProvenanceVerified:false;hostQualified:false;bodyAdmissionAuthorized:false;liveReady:false}>;

// Intentionally private and unmounted. Test harness exposes this lexical function
// only inside its VM with node:https replaced; production entry cannot reach it.
async function requestPublicKeys(signal?:AbortSignal):Promise<Result> {
  return new Promise(resolve=>{
    let req:ClientRequest|undefined,res:IncomingMessage|undefined,timer:ReturnType<typeof setTimeout>|undefined;
    let done=false,count=0;const chunks:Buffer[]=[];const start=performance.now();
    const finish=(result:Result)=>{
      if(done)return;done=true;
      if(timer)clearTimeout(timer);
      try{signal?.removeEventListener('abort',abort);}catch{/* no caller diagnostics */}
      try{res?.destroy();}catch{/* no caller diagnostics */}
      try{req?.destroy();}catch{/* no caller diagnostics */}
      resolve(result);
    };
    const abort=()=>finish(failure());
    const expired=()=>performance.now()-start>=totalMs;
    try {
      if(signal?.aborted){finish(failure());return;}
      signal?.addEventListener('abort',abort,{once:true});
      if(done)return;
      timer=setTimeout(abort,totalMs);
      req=request({protocol:'https:',hostname:host,port:443,path,method:'GET',agent:false,
        rejectUnauthorized:true,minVersion:'TLSv1.2',maxHeaderSize:headerBytes,
        headers:{accept:'application/json','accept-encoding':'identity'}},response=>{
        res=response;
        response.on('error',abort);response.on('aborted',abort);
        response.on('close',()=>{if(!done)abort();});
        try {
          if(done){response.destroy();return;}
          if(expired() || response.statusCode!==200){abort();return;}
          if(response.rawHeaders.reduce((n,v)=>n+Buffer.byteLength(v)+4,0)>headerBytes){abort();return;}
          const values=new Map<string,string>();
          for(let i=0;i<response.rawHeaders.length;i+=2) {
            const k=response.rawHeaders[i].toLowerCase(),v=response.rawHeaders[i+1];
            if(values.has(k) && ['content-length','content-type','content-encoding','cache-control','age'].includes(k)){abort();return;}
            values.set(k,v);
          }
          if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(values.get('content-type')||'')
            || (values.has('content-encoding') && values.get('content-encoding')!=='identity')){abort();return;}
          const length=values.get('content-length');
          if(length!==undefined && (!/^(0|[1-9][0-9]{0,5})$/.test(length) || Number(length)>bodyBytes)){abort();return;}
          const cache=values.get('cache-control')||'';
          const directives=new Map<string,string|null>(),parts=cache.split(',');
          if(parts.length>16){abort();return;}
          for(const part of parts) {
            const equals=part.indexOf('='),name=(equals<0?part:part.slice(0,equals)).trim().toLowerCase();
            const value=equals<0?null:part.slice(equals+1).trim();
            if(!/^[a-z][a-z0-9-]*$/.test(name) || directives.has(name)
              || name==='no-store' || name==='no-cache' || value===''){abort();return;}
            directives.set(name,value);
          }
          const maxAge=directives.get('max-age');
          const age=values.get('age')||'0';
          if(typeof maxAge!=='string' || !/^[0-9]{1,9}$/.test(maxAge) || !/^[0-9]{1,9}$/.test(age)){abort();return;}
          const freshness=Math.min(60000,(Number(maxAge)-Number(age))*1000);
          if(freshness<=0){abort();return;}
          response.on('data',(chunk:unknown)=>{
            try {
              if(done)return;
              if(expired() || !Buffer.isBuffer(chunk)){abort();return;}
              count+=chunk.length;if(count>bodyBytes){abort();return;}
              chunks.push(Buffer.from(chunk));
            } catch {abort();}
          });
          response.on('end',()=>{
            try {
              if(done)return;
              const elapsed=performance.now()-start;
              if(expired() || !response.complete || (length!==undefined && count!==Number(length)) || elapsed>=freshness){abort();return;}
              const text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));keySet(text);
              finish(Object.freeze({ok:true,code:'PUBLIC_JWKS_BYTES_ONLY',jwksJson:text,maxAgeMs:Math.floor(freshness-elapsed),
                googleProvenanceVerified:false,hostQualified:false,bodyAdmissionAuthorized:false,liveReady:false}));
            }catch{abort();}
          });
        }catch{abort();}
      });
      req.on('error',abort);req.setTimeout(totalMs,abort);
      if(done){req.destroy();return;}
      req.end();
    }catch{abort();}
  });
}
// Real provider path remains compile-time closed, regardless of passed values.
export function fetchGooglePublicJwks(..._untrusted:unknown[]):Promise<ReturnType<typeof failure>> {return Promise.resolve(failure());}
