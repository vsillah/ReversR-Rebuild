import { createPublicKey, verify, constants } from 'node:crypto';
import * as identityFormat from './googleIdentityFormat';
// Capture trusted source helpers once; later CommonJS export replacement must
// not change the interpretation of signed bytes or the validation bounds.
const { base64url, exactRecord, keySet, parseUniqueJson, plainRecord } = identityFormat;

type Clock = { lowerMs:number; upperMs:number; monotonicMs:number };
type Policy = { issuer:string; audience:string; subject:string; serviceAccountEmail:string|null };
type Keys = { jwksJson:string; observedAtMs:number; expiresAtMs:number };
const issuer='https://accounts.google.com';
function decision(checked=false) {
  return Object.freeze({code:checked?'SUPPLIED_TEST_SIGNATURE_CHECKED':'GOOGLE_IDENTITY_DENIED',
    signatureCheckedAgainstSuppliedTestKeys:checked,googleProvenanceVerified:false,
    hostQualified:false,bodyAdmissionAuthorized:false,liveReady:false,providerPathEnabled:false});
}
function clock(value:unknown): Clock {
  if(!exactRecord(value,['lowerMs','upperMs','monotonicMs']) || !Object.values(value).every(v=>Number.isSafeInteger(v) && (v as number)>=0))throw Error('CLOCK');
  const c={...value} as Clock;
  if(c.lowerMs>c.upperMs || c.upperMs-c.lowerMs>1000)throw Error('CLOCK');return c;
}
function policy(value:unknown): Policy {
  if(!exactRecord(value,['issuer','audience','subject','serviceAccountEmail']) || value.issuer!==issuer
    || typeof value.audience!=='string' || value.audience.length<1 || value.audience.length>512 || /[\x00-\x20\x7f]/.test(value.audience)
    || typeof value.subject!=='string' || !/^[1-9][0-9]{0,30}$/.test(value.subject)
    || !(value.serviceAccountEmail===null || (typeof value.serviceAccountEmail==='string' && value.serviceAccountEmail.length<=254
      && /^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9.-]*\.iam\.gserviceaccount\.com$/.test(value.serviceAccountEmail))))throw Error('POLICY');
  return {...value} as Policy;
}
function claimsValid(c:Record<string,unknown>,p:Policy,t:Clock):boolean {
  return c.iss===p.issuer && c.aud===p.audience && c.sub===p.subject
    && (!Object.hasOwn(c,'azp') || c.azp===p.subject)
    && ['iat','exp'].every(k=>Number.isSafeInteger(c[k]) && (c[k] as number)>=0 && (c[k] as number)<=Number.MAX_SAFE_INTEGER/1000)
    && (!Object.hasOwn(c,'nbf') || (Number.isSafeInteger(c.nbf) && (c.nbf as number)>=0 && (c.nbf as number)<=Number.MAX_SAFE_INTEGER/1000))
    && (c.exp as number)>(c.iat as number) && (c.exp as number)-(c.iat as number)<=3600
    && (c.iat as number)*1000<=t.lowerMs && (c.exp as number)*1000>t.upperMs
    && (!Object.hasOwn(c,'nbf') || ((c.nbf as number)>=(c.iat as number) && (c.nbf as number)<(c.exp as number) && (c.nbf as number)*1000<=t.lowerMs))
    && (!Object.hasOwn(c,'email') || (typeof c.email==='string' && c.email.length<=254))
    && (!Object.hasOwn(c,'email_verified') || typeof c.email_verified==='boolean')
    && (p.serviceAccountEmail===null || (c.email===p.serviceAccountEmail && c.email_verified===true));
}
// Synthetic-only seam: callbacks and supplied keys can NEVER establish Google
// provenance or custody. Production entry below never calls this seam.
export async function verifySignatureAgainstSuppliedTestKeys(token:unknown,configuration:unknown,
  readTestKeys:()=>Promise<unknown>,readTestClock:()=>unknown) {
  try {
    const p=policy(configuration); // Missing policy denies before either callback.
    if(typeof token!=='string' || token.length>12288 || typeof readTestKeys!=='function' || typeof readTestClock!=='function')return decision();
    const parts=token.split('.');if(parts.length!==3)return decision();
    const decode=(s:string,n:number)=>new TextDecoder('utf-8',{fatal:true}).decode(base64url(s,n));
    const h=parseUniqueJson(decode(parts[0],1024),1024),c=parseUniqueJson(decode(parts[1],6144),6144);
    const signature=base64url(parts[2],512);
    if(!exactRecord(h,['alg','kid','typ']) || h.alg!=='RS256' || h.typ!=='JWT'
      || typeof h.kid!=='string' || !/^[A-Za-z0-9_-]{1,128}$/.test(h.kid) || !plainRecord(c)
      || Object.keys(c).some(k=>!['iss','aud','sub','iat','nbf','exp','azp','email','email_verified'].includes(k)))return decision();
    const before=clock(readTestClock());if(!claimsValid(c,p,before))return decision();
    const raw=await readTestKeys();
    if(!exactRecord(raw,['jwksJson','observedAtMs','expiresAtMs']) || typeof raw.jwksJson!=='string'
      || !Number.isSafeInteger(raw.observedAtMs) || !Number.isSafeInteger(raw.expiresAtMs))return decision();
    const keys={...raw} as Keys,after=clock(readTestClock());
    const elapsed=after.monotonicMs-before.monotonicMs;
    if(elapsed<0 || elapsed>5000 || after.lowerMs<before.lowerMs || after.upperMs<before.upperMs
      || after.lowerMs>before.upperMs+elapsed || after.upperMs<before.lowerMs+elapsed
      || keys.observedAtMs<0 || keys.observedAtMs>before.lowerMs || keys.expiresAtMs<=keys.observedAtMs
      || keys.expiresAtMs-keys.observedAtMs>60000 || after.upperMs-keys.observedAtMs>60000
      || after.upperMs>=keys.expiresAtMs || !claimsValid(c,p,after))return decision();
    const matches=keySet(keys.jwksJson).filter(k=>k.kid===h.kid);if(matches.length!==1)return decision();
    const k=matches[0];
    const publicKey=createPublicKey({key:{kty:'RSA',n:k.n as string,e:k.e as string},format:'jwk'});
    const bits=publicKey.asymmetricKeyDetails?.modulusLength;
    if(publicKey.asymmetricKeyType!=='rsa' || !bits || bits<2048 || bits>4096 || signature.length!==Math.ceil(bits/8))return decision();
    return decision(verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1],'ascii'),
      {key:publicKey,padding:constants.RSA_PKCS1_PADDING},signature));
  } catch { return decision(); }
}
// No installation/configuration or trusted clock exists. No environment lookup,
// provider request, input inspection, boolean or callback can open this entry.
export function verifyGoogleServiceIdentity(..._untrusted:unknown[]) { return decision(); }
