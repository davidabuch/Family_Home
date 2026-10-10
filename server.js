import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes,scryptSync,timingSafeEqual,createHmac} from 'node:crypto';
import {ALLOWED,VISIBLE,authorize,serviceFor} from './lib/permissions.js';
const port=Number(process.env.PORT||8099);
const ha=(process.env.HA_URL||'').replace(/\/$/,'');
const token=process.env.HA_TOKEN||'';
const secret=process.env.SESSION_SECRET||'';
const username=process.env.FAMILY_HOME_USERNAME||'alexis';
const passHash=process.env.FAMILY_HOME_PASSWORD_HASH||'';
if(!ha||!token||secret.length<32||!passHash)throw Error('Configure HA_URL, HA_TOKEN, SESSION_SECRET and FAMILY_HOME_PASSWORD_HASH before starting.');
const sessions=new Map(), attempts=new Map();
const safeEqual=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
function verifyPassword(password){const [salt,expected]=passHash.split(':');if(!salt||!expected)return false;return safeEqual(scryptSync(password,salt,64).toString('hex'),expected)}
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=').map(decodeURIComponent)).filter(x=>x.length===2))}
function getSession(req){const sid=cookies(req).fh_session;const s=sessions.get(sid);if(!s)return null;if(s.expires<Date.now()){sessions.delete(sid);return null}return s}
function json(res,status,data,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'",...headers});res.end(JSON.stringify(data))}
async function body(req){let str='';for await(const part of req){str+=part;if(str.length>4096)throw Error('Request too large')}return JSON.parse(str||'{}')}
async function haRequest(path,method='GET',payload){const response=await fetch(ha+'/api/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(7000)});if(!response.ok)throw Error('HA HTTP '+response.status);return response.json()}
function isSameOrigin(req){const origin=req.headers.origin;const host=req.headers.host;return !origin||new URL(origin).host===host}
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');const path=url.pathname;
 if(req.method==='GET'&&['/','/index.html','/manifest.webmanifest','/app.js'].includes(path)){const name=path==='/manifest.webmanifest'?'manifest.webmanifest':path==='/app.js'?'app.js':'index.html';const data=await readFile(new URL('./public/'+name,import.meta.url));res.writeHead(200,{'Content-Type':name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'text/javascript; charset=utf-8':'application/manifest+json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(data);return}
 if(path==='/api/health'&&req.method==='GET')return json(res,200,{ok:true});
 if(path==='/api/login'&&req.method==='POST'){if(!isSameOrigin(req))return json(res,403,{error:'Origin rejected'});const ip=req.socket.remoteAddress||'unknown',now=Date.now(),a=attempts.get(ip)||[];const recent=a.filter(t=>now-t<600000);if(recent.length>=5)return json(res,429,{error:'Too many attempts'});const data=await body(req);if(data.username!==username||typeof data.password!=='string'||!verifyPassword(data.password)){recent.push(now);attempts.set(ip,recent);return json(res,401,{error:'Invalid credentials'})}attempts.delete(ip);const sid=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');sessions.set(sid,{csrf,expires:now+8*3600000});return json(res,200,{csrf,username},{'Set-Cookie':`fh_session=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${req.socket.encrypted?'; Secure':''}`})}
 const session=getSession(req);if(!session)return json(res,401,{error:'Login required'});
 if(path==='/api/me'&&req.method==='GET')return json(res,200,{username,csrf:session.csrf});
 if(path==='/api/logout'&&req.method==='POST'){if(!isSameOrigin(req)||req.headers['x-csrf-token']!==session.csrf)return json(res,403,{error:'Forbidden'});sessions.delete(cookies(req).fh_session);return json(res,200,{ok:true},{'Set-Cookie':'fh_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'})}
 if(path==='/api/states'&&req.method==='GET'){const states=await haRequest('states');return json(res,200,{states:states.filter(s=>VISIBLE.includes(s.entity_id)).map(s=>({entity_id:s.entity_id,state:s.state,attributes:{friendly_name:s.attributes?.friendly_name,current_position:s.attributes?.current_position,supported_features:s.attributes?.supported_features,supported_color_modes:s.attributes?.supported_color_modes,brightness:s.attributes?.brightness,device_class:s.attributes?.device_class}}))})}
 if(path==='/api/action'&&req.method==='POST'){if(!isSameOrigin(req)||req.headers['x-csrf-token']!==session.csrf)return json(res,403,{error:'Forbidden'});const {entity_id,action,value}=await body(req);if(typeof entity_id!=='string'||typeof action!=='string'||!authorize(entity_id,action))return json(res,403,{error:'Action not permitted'});const service=serviceFor(entity_id,action);const payload={entity_id};if(action==='set_brightness'||action==='set_position'){if(!Number.isInteger(value)||value<1&&action==='set_brightness'||value<0||value>100)return json(res,400,{error:'Position/brightness must be an integer from 0 to 100 (brightness 1 to 100)'});if(action==='set_brightness')payload.brightness_pct=value;else payload.position=value;}await haRequest('services/'+service.domain+'/'+service.service,'POST',payload);return json(res,200,{ok:true})}
 return json(res,404,{error:'Not found'});
}catch(err){if(err instanceof SyntaxError)return json(res,400,{error:'Invalid JSON'});if(err.message==='Request too large')return json(res,413,{error:err.message});console.error(err);return json(res,502,{error:'Request failed'})}});
server.listen(port,'0.0.0.0',()=>console.log('Family Home listening on '+port));
