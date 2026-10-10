// Transport is trusted only when TLS is direct or the immediate peer is an explicitly allowlisted proxy.
export function isSecureTransport(req,trustedProxyAddresses=new Set()){
 if(req.socket?.encrypted===true)return true;
 const peer=req.socket?.remoteAddress;
 if(!peer||!trustedProxyAddresses.has(peer))return false;
 const forwarded=req.headers?.['x-forwarded-proto'];
 return typeof forwarded==='string'&&forwarded.trim().toLowerCase()==='https';
}
