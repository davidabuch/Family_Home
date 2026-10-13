// Trust forwarded HTTPS only from an explicitly allowlisted immediate reverse proxy.
// An arbitrary client-supplied X-Forwarded-Proto header is never sufficient.
export function isSecureTransport(req,trustedProxyAddresses=new Set()){
 if(req.socket?.encrypted===true)return true;
 const peer=req.socket?.remoteAddress;
 if(typeof peer!=='string'||!trustedProxyAddresses.has(peer))return false;
 const forwarded=req.headers?.['x-forwarded-proto'];
 return typeof forwarded==='string'&&forwarded.trim().toLowerCase()==='https';
}
