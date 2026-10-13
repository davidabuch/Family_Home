import {timingSafeEqual} from 'node:crypto';
// Transport is trusted only when TLS is direct or the immediate peer is an explicitly allowlisted proxy.
export function isSecureTransport(req,trustedProxyAddresses=new Set(),proxySecret=''){
 if(req.socket?.encrypted===true)return true;
 const peer=req.socket?.remoteAddress;
 if(!peer||!trustedProxyAddresses.has(peer))return false;
 const supplied=req.headers?.['x-family-proxy-secret'];
 if(typeof supplied!=='string'||typeof proxySecret!=='string'||proxySecret.length<32)return false;
 const actual=Buffer.from(supplied),expected=Buffer.from(proxySecret);
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return false;
 const forwarded=req.headers?.['x-forwarded-proto'];
 return typeof forwarded==='string'&&forwarded.trim().toLowerCase()==='https';
}
