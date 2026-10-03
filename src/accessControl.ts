export type AccessStage = 'activation' | 'daily';
const CODE_DIGESTS = {
  "activation": {
    "salt": "300fabc26811fe4ca8a7ede0ba8264be",
    "hash": "c1aff1c3fabee52a9ca8c90172cb190acd6cdb876148ffc7aea8b8c8854ccf16"
  },
  "daily": {
    "salt": "4496df1d21fa07bd02c9390c42483078",
    "hash": "39ec3ff1816a719043d875e62e31ce48d345ac7578322f866e4dc3c5c55f5cd1"
  }
};
const ACTIVATION_KEY = 'military_device_activation_v1';
const ATTEMPTS_KEY = 'military_activation_attempts_v1';
export const readActivation = () => { try {return localStorage.getItem(ACTIVATION_KEY) === 'activated-v1';} catch {return false;} };
export const saveActivation = () => localStorage.setItem(ACTIVATION_KEY,'activated-v1');
export const readActivationAttempts = () => { try {const value=Number(localStorage.getItem(ATTEMPTS_KEY));return Number.isFinite(value) && value>0 ? Math.floor(value) : 0;} catch {return 0;} };
export const saveActivationAttempts = (attempts:number) => localStorage.setItem(ATTEMPTS_KEY,String(attempts));
const fromHex = (hex:string) => new Uint8Array(hex.match(/../g)!.map(part=>parseInt(part,16)));
export async function verifyAccessCode(code:string, stage:AccessStage):Promise<boolean> {
 const config=CODE_DIGESTS[stage];
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(code),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:fromHex(config.salt),iterations:160000,hash:'SHA-256'},key,256);
 const actual=new Uint8Array(bits),expected=fromHex(config.hash);
 return actual.reduce((difference,byte,index)=>difference | (byte ^ expected[index]),0)===0;
}
