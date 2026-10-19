import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {serviceFor} from './lib/permissions.js';
import {loadDatabase,saveDatabase} from './lib/database.js';
import {isSecureTransport} from './lib/transport.js';
import {passwordHash,passwordMatches,createSession,resolveSession,revokeUserSessions} from './lib/auth.js';
import {createUser,setProfile,disableUser,changePassword,listUsers,requireAdmin} from './lib/admin.js';
import {seedAlexis,permitted,profileEntities,allowedActions} from './lib/profiles.js';
const port=Number(process.env.PORT||8099);
const ha=(process.env.HA_URL||'').replace(/\/$/,'');
const token=process.env.HA_TOKEN||'';
const secret=process.env.SESSION_SECRET||'';
const username=(process.env.FAMILY_HOME_USERNAME||'alexis').toLowerCase();
if(!ha||!token||secret.length<32)throw Error('Configure HA_URL, HA_TOKEN and SESSION_SECRET before starting.');
const attempts=new Map();
const trustedProxyAddresses=new Set((process.env.FAMILY_HOME_TRUSTED_PROXY_IPS||'').split(',').map(x=>x.trim()).filter(Boolean));
const dbPath=process.env.FAMILY_HOME_DB_PATH||'/data/family-home.json';
const {db,migrated}=await loadDatabase(dbPath,username);
if(migrated){
 // New installations begin without family members; administrator bootstrap creates the first account.
 await saveDatabase(dbPath,db);
}
const adminName=process.env.FAMILY_HOME_ADMIN_USERNAME||'';
const adminPassword=process.env.FAMILY_HOME_ADMIN_PASSWORD||'';
// Non-sensitive bootstrap diagnostic; never log passwords, hashes or session secrets.
console.info('Family Home admin bootstrap:',JSON.stringify({configured:!!adminName,password_supplied:adminPassword.length>=12,existing_admin_count:db.users.filter(u=>u.role==='admin').length,configured_username_matches_existing_admin:db.users.some(u=>u.role==='admin'&&u.username===adminName)}));
if(adminName&&adminPassword.length>=12){
 const configuredAdmin=db.users.find(u=>u.role==='admin'&&u.username===adminName);
 if(configuredAdmin){
  // Reconcile only when the add-on's configured bootstrap password has changed.
  // Later in-app password changes are preserved when the add-on configuration is unchanged.
  if(!db.admin_bootstrap_password_hash||!passwordMatches(adminPassword,db.admin_bootstrap_password_hash)){
   configuredAdmin.password_hash=passwordHash(adminPassword);
   configuredAdmin.enabled=true;
   revokeUserSessions(db,configuredAdmin.id);
   db.admin_bootstrap_password_hash=passwordHash(adminPassword);
   await persist();
   console.info('Family Home administrator credentials reconciled from add-on configuration.');
  }
 }else if(!db.users.some(u=>u.role==='admin')){
  if(db.users.some(u=>u.username===adminName))throw Error('Administrator username conflicts with existing account');
  db.users.push({id:randomBytes(16).toString('hex'),username:adminName,display_name:'Family Administrator',role:'admin',password_hash:passwordHash(adminPassword),enabled:true,remote_access:false});
  db.admin_bootstrap_password_hash=passwordHash(adminPassword);
  await persist();
 }else{
  console.warn('Family Home configured administrator username differs from stored administrator; existing account preserved.');
 }
}
function userPasswordMatches(password,stored){
 if(stored.startsWith('legacy:')){
  const [salt,expected]=stored.slice(7).split(':');
  if(!salt||!expected)return false;
  return safeEqual(scryptSync(password,salt,64).toString('hex'),expected);
 }
 return passwordMatches(password,stored);
}
function secureRequest(req){
 // Trust proxy forwarding only when explicitly configured with a trusted proxy.
 return isSecureTransport(req,trustedProxyAddresses);
}
function getSession(req){
 const sid=cookies(req).fh_session;
 const match=resolveSession(db,sid);
 return match?{...match.session,user:match.user}:null;
}
async function persist(){await saveDatabase(dbPath,db)}

const safeEqual=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
function verifyPassword(password){const [salt,expected]=passHash.split(':');if(!salt||!expected)return false;return safeEqual(scryptSync(password,salt,64).toString('hex'),expected)}
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=').map(decodeURIComponent)).filter(x=>x.length===2))}
function json(res,status,data,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'",...headers});res.end(JSON.stringify(data))}
async function body(req){let str='';for await(const part of req){str+=part;if(str.length>4096)throw Error('Request too large')}return JSON.parse(str||'{}')}
async function haRequest(path,method='GET',payload){const response=await fetch(ha+'/api/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(7000)});if(!response.ok)throw Error('HA HTTP '+response.status);return response.json()}
function isSameOrigin(req){const origin=req.headers.origin;const host=req.headers.host;return !origin||new URL(origin).host===host}
const iconAssets=Object.fromEntries([16,32,180,192,512].map(size=>['/icons/approved-v2/icon-'+size+'.png','icons/approved-v2/icon-'+size+'.png']));
iconAssets['/favicon.ico']='icons/approved-v2/favicon.ico';
for(const alias of ['/apple-touch-icon.png','/apple-touch-icon-precomposed.png'])iconAssets[alias]='icons/approved-v2/icon-180.png';
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');const path=url.pathname;
 if(path==='/api/login'&&req.method==='POST'&&!secureRequest(req)){
  const peer=req.socket?.remoteAddress||'unknown';
  console.warn('Family Home HTTPS proxy diagnostic:',JSON.stringify({
   peer, trusted_proxy_match:trustedProxyAddresses.has(peer),
   forwarded_https:req.headers['x-forwarded-proto']==='https',
   trusted_proxy_count:trustedProxyAddresses.size
  }));
 }

 if(req.method==='GET'&&['/','/index.html','/manifest.webmanifest','/app.js','/admin.html','/admin.js','/sculptural-white.svg',...Object.keys(iconAssets)].includes(path)){const name=iconAssets[path]|| (path==='/manifest.webmanifest'?'manifest.webmanifest':path==='/app.js'?'app.js':path==='/admin.html'?'admin.html':path==='/admin.js'?'admin.js':path==='/sculptural-white.svg'?'sculptural-white.svg':'index.html');const data=await readFile(new URL('./public/'+name,import.meta.url));res.writeHead(200,{'Content-Type':name.endsWith('.png')?'image/png':name.endsWith('.ico')?'image/x-icon':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'text/javascript; charset=utf-8':'application/manifest+json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(data);return}
 if(path==='/api/health'&&req.method==='GET')return json(res,200,{ok:true});
 if(path==='/api/login'&&req.method==='POST'){
  if(!isSameOrigin(req))return json(res,403,{error:'Origin rejected'});
  if(!secureRequest(req))return json(res,426,{error:'HTTPS required for Family Home sign-in'});
  const ip=req.socket.remoteAddress||'unknown',now=Date.now(),recent=(attempts.get(ip)||[]).filter(t=>now-t<600000);
  if(recent.length>=5)return json(res,429,{error:'Too many attempts'});
  const data=await body(req),user=db.users.find(u=>u.username===String(data.username??'').trim().toLowerCase()&&u.enabled!==false&&(!u.expires_at||Date.parse(u.expires_at)>now));
  if(!user||typeof data.password!=='string'||!userPasswordMatches(data.password,user.password_hash)){
   recent.push(now);attempts.set(ip,recent);return json(res,401,{error:'Invalid credentials'});
  }
  attempts.delete(ip);
  const created=createSession(db,user.id,{secure:true});
  await persist();
  return json(res,200,{csrf:created.csrf,username:user.username,role:user.role},{'Set-Cookie':`fh_session=${created.token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`});
 }
 if(!secureRequest(req))return json(res,426,{error:'HTTPS required'});
 const session=getSession(req);if(!session)return json(res,401,{error:'Login required'});
 if(path==='/api/me'&&req.method==='GET')return json(res,200,{username:session.user.username,display_name:session.user.display_name,role:session.user.role,csrf:session.csrf,profile:db.profiles[session.user.id]||{rooms:[]}});
 if(path==='/api/logout'&&req.method==='POST'){if(!isSameOrigin(req)||req.headers['x-csrf-token']!==session.csrf)return json(res,403,{error:'Forbidden'});db.sessions=db.sessions.filter(s=>s.id!==session.id);await persist();return json(res,200,{ok:true},{'Set-Cookie':'fh_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'})}
 if(path==='/api/states'&&req.method==='GET'){const states=await haRequest('states');return json(res,200,{states:states.filter(s=>profileEntities(db.profiles[session.user.id]||{rooms:[]}).has(s.entity_id)).map(s=>({entity_id:s.entity_id,state:s.state,attributes:{friendly_name:s.attributes?.friendly_name,current_position:s.attributes?.current_position,supported_features:s.attributes?.supported_features,supported_color_modes:s.attributes?.supported_color_modes,brightness:s.attributes?.brightness,percentage:s.attributes?.percentage,percentage_step:s.attributes?.percentage_step,device_class:s.attributes?.device_class}}))})}
 if(path==='/api/action'&&req.method==='POST'){if(!isSameOrigin(req)||req.headers['x-csrf-token']!==session.csrf)return json(res,403,{error:'Forbidden'});const {entity_id,action,value}=await body(req);if(typeof entity_id!=='string'||typeof action!=='string'||!permitted(db.profiles[session.user.id],entity_id,action))return json(res,403,{error:'Action not permitted'});const live=await haRequest('states/'+encodeURIComponent(entity_id));if(!allowedActions(entity_id,live.attributes).includes(action))return json(res,403,{error:'Action unavailable for device'});const service=serviceFor(entity_id,action)||{domain:entity_id.split('.')[0],service:action==='set_brightness'?'turn_on':action==='set_position'?'set_cover_position':action};const payload={entity_id};if(action==='set_brightness'||action==='set_position'||action==='set_percentage'){if(!Number.isInteger(value)||value<1&&action==='set_brightness'||value<0||value>100)return json(res,400,{error:'Position/brightness must be an integer from 0 to 100 (brightness 1 to 100)'});if(action==='set_brightness')payload.brightness_pct=value;else if(action==='set_percentage')payload.percentage=value;else payload.position=value;}await haRequest('services/'+service.domain+'/'+service.service,'POST',payload);return json(res,200,{ok:true})}
 if(path==='/api/admin/users'&&req.method==='GET'){
  if(session.user.role!=='admin')return json(res,403,{error:'Administrator required'});
  return json(res,200,{users:listUsers(db,session.user)});
 }
 if(path==='/api/admin/profile'&&req.method==='GET'){
  if(session.user.role!=='admin')return json(res,403,{error:'Administrator required'});
  const userId=url.searchParams.get('user_id');
  if(!db.users.some(u=>u.id===userId))return json(res,404,{error:'User not found'});
  return json(res,200,{profile:db.profiles[userId]||{rooms:[]}});
 }
 if(path==='/api/admin/entities'&&req.method==='GET'){
  if(session.user.role!=='admin')return json(res,403,{error:'Administrator required'});
  const states=await haRequest('states');
  return json(res,200,{entities:states.filter(s=>allowedActions(s.entity_id,s.attributes).length).map(s=>({entity_id:s.entity_id,name:s.attributes?.friendly_name||s.entity_id,actions:allowedActions(s.entity_id,s.attributes)}))});
 }
 if(path.startsWith('/api/admin/')&&req.method==='POST'){
  if(!isSameOrigin(req)||req.headers['x-csrf-token']!==session.csrf)return json(res,403,{error:'Forbidden'});
  if(session.user.role!=='admin')return json(res,403,{error:'Administrator required'});
  const data=await body(req);
  try{
   let result={ok:true};
   if(path==='/api/admin/users')result={user:createUser(db,session.user,data)};
   else if(path==='/api/admin/profile'){setProfile(db,session.user,data.user_id,data.profile)}
   else if(path==='/api/admin/disable'){disableUser(db,session.user,data.user_id)}
   else if(path==='/api/admin/password'){changePassword(db,session.user,data.user_id,data.password)}
   else return json(res,404,{error:'Not found'});
   await persist();return json(res,200,result);
  }catch(e){return json(res,400,{error:e.message})}
 }
 return json(res,404,{error:'Not found'});
}catch(err){if(err instanceof SyntaxError)return json(res,400,{error:'Invalid JSON'});if(err.message==='Request too large')return json(res,413,{error:err.message});console.error('Family Home request failed');return json(res,502,{error:'Request failed'})}});
server.listen(port,'0.0.0.0',()=>console.log('Family Home listening on '+server.address().port));
