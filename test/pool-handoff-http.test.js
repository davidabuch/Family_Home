import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {createSession} from '../lib/auth.js';

const secret='mock-only-handoff-secret-at-least-32-characters',origin='https://home-local.davidbuchmd.com';
let child,ha,directory,url,db,tokens={},haCalls=0,output='';
const baseHeaders={Host:'home-local.davidbuchmd.com',Origin:origin,'Content-Type':'application/json',
 'X-Forwarded-Proto':'https','X-Family-Boundary':'local','X-Family-Proxy-Secret':secret};
async function request({method='POST',role='admin',headers={},path='/api/pool-admin-handoff'}={}){
 const h={...baseHeaders,Cookie:`fh_session=${tokens[role]?.token}`, 'X-CSRF-Token':tokens[role]?.csrf,...headers};
 for(const k of Object.keys(h))if(h[k]===undefined)delete h[k];
 return new Promise((resolve,reject)=>{
  const req=http.request(url+path,{method,headers:h},res=>{
   let data='';res.on('data',part=>{data+=part});res.on('end',()=>resolve(new Response(data,{status:res.statusCode,headers:res.headers})));
  });req.on('error',reject);req.end(method==='POST'?'{}':undefined);
 });
}
test.before(async()=>{
 directory=await mkdtemp(join(tmpdir(),'family-home-auth-test-'));
 db={schema:1,users:[],profiles:{},sessions:[]};
 for(const role of ['admin','member','disabled','expired','remote-blocked']){
  db.users.push({id:role,username:role,role:role==='member'?'member':'admin',enabled:role!=='disabled',password_hash:'not-used',remote_access:role==='admin'});
  db.profiles[role]={rooms:[],show_pool:true};
  tokens[role]=createSession(db,role,{secure:true});
  if(role==='expired')tokens[role].session.expires=Date.now()-1;
 }
 await writeFile(join(directory,'db.json'),JSON.stringify(db));
 ha=http.createServer((_req,res)=>{haCalls++;res.writeHead(500);res.end('{}')});
 ha.listen(0,'127.0.0.1');await once(ha,'listening');
 child=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'0',HA_URL:`http://127.0.0.1:${ha.address().port}`,
  HA_TOKEN:'mock-equipment-token',SESSION_SECRET:secret,POOL_HANDOFF_SECRET:secret,FAMILY_HOME_DB_PATH:join(directory,'db.json'),
  FAMILY_HOME_ADMIN_USERNAME:'',FAMILY_HOME_ADMIN_PASSWORD:'',FAMILY_HOME_TRUSTED_PROXY_IPS:'127.0.0.1,::ffff:127.0.0.1',
  FAMILY_HOME_PROXY_SECRET:secret,FAMILY_HOME_PUBLIC_ORIGIN:origin,FAMILY_HOME_REMOTE_ORIGIN:'https://home.davidbuchmd.com',POOL_REMOTE_ORIGIN:'https://pool.davidbuchmd.com'}});
 child.stderr.on('data',part=>{output+=part});
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Test server startup timed out')),10000);
  child.stdout.on('data',part=>{output+=part;const match=output.match(/Family Home listening on (\d+)/);if(match){url='http://127.0.0.1:'+match[1];clearTimeout(timer);resolve()}});
  child.once('exit',()=>{clearTimeout(timer);reject(Error('Test server exited before startup'))});
 });
});
test.after(async()=>{
 if(child){const exited=once(child,'exit');child.kill();await exited}
 if(ha)await new Promise(resolve=>ha.close(resolve));
 if(directory)await rm(directory,{recursive:true,force:true});
 assert.equal(haCalls,0,'Ticket endpoints must never contact Home Assistant');
 assert.ok(!output.includes(secret),'Credentials must never be logged');
 assert.ok(!output.includes('ticket='),'Tickets must never be logged');
});
test('authenticated administrator receives only a no-store JSON body, never a redirect',async()=>{
 const r=await request();assert.equal(r.status,200);assert.equal(r.headers.get('location'),null);
 assert.equal(r.headers.get('cache-control'),'no-store');const data=await r.json();
 assert.equal(data.pool_origin,'https://pool-local.davidbuchmd.com');assert.match(data.ticket,/^[\w-]+\.[\w-]+$/);
 assert.equal(output.includes(data.ticket),false);
});
test('old GET redirect is rejected and cannot mint a ticket',async()=>assert.equal((await request({method:'GET'})).status,405));
test('members, expired sessions and disabled accounts are denied',async()=>{
 for(const role of ['member','expired','disabled'])assert.ok([401,403].includes((await request({role})).status));
});
test('forged proxy secret, protocol and direct-port assertions are denied',async()=>{
 for(const headers of [{'X-Family-Proxy-Secret':undefined},{'X-Family-Proxy-Secret':'forged'},{'X-Forwarded-Proto':'http'},{'X-Forwarded-Proto':'https,http'}]){
  assert.equal((await request({headers})).status,426);
 }
});
test('origin, CSRF, JSON and proxy boundary are required',async()=>{
 for(const headers of [{Origin:undefined},{Origin:'https://evil.test'},{'X-CSRF-Token':'forged'},{'X-CSRF-Token':undefined},{'X-Family-Boundary':'remote'},{'Sec-Fetch-Site':'cross-site'}])assert.equal((await request({headers})).status,403);
 assert.equal((await request({headers:{'Content-Type':'text/plain'}})).status,415);
});
test('remote administrator must be explicitly eligible and use remote boundary',async()=>{
 const headers={Host:'home.davidbuchmd.com',Origin:'https://home.davidbuchmd.com','X-Family-Boundary':'remote'};
 const r=await request({headers});assert.equal(r.status,200);assert.equal((await r.json()).pool_origin,'https://pool.davidbuchmd.com');
 assert.equal((await request({headers,role:'remote-blocked'})).status,403);
 assert.equal((await request({headers:{...headers,'X-Family-Boundary':'local'}})).status,403);
});
test('real Family Home HTTP ticket authorizes the Pool handler and is consumed once',
 {skip:!process.env.POOL_SOURCE},async()=>{
 const response=await request();assert.equal(response.status,200);const {ticket}=await response.json();
 const {spawnSync}=await import('node:child_process');
 const script=`import sys, json
from pathlib import Path
sys.path.insert(0, str(Path(sys.argv[1])/'standalone'))
sys.path.insert(0, str(Path(sys.argv[1])/'standalone/tests'))
from test_auth_acceptance import AuthenticationAcceptance, server
from unittest.mock import patch
AuthenticationAcceptance.setUpClass()
case=AuthenticationAcceptance()
case.setUp()
try:
    auth=server.AdminHandoff(sys.argv[3], replay_file=case.replay_file)
    with patch.object(server,'ADMIN_HANDOFF',auth):
        status, _, cookie=case.request('/api/admin/handoff',{'ticket':sys.argv[2]})
        assert status==200
        headers={'Cookie':cookie.split(';',1)[0]}
        assert case.request('/api/permissions',headers=headers,method='GET')[1]=={'pool_control':True}
        for op in ('on','off','temperature'):
            assert case.request(body={'control':'pool','operation':op,'value':80},headers=headers)[0]==200
        assert case.ha.call_count==3
        assert all(call.args[0].startswith('/api/services/climate/') for call in case.ha.call_args_list)
        case.ha.reset_mock()
        assert case.request('/api/admin/handoff',{'ticket':sys.argv[2]})[0]==403
        auth.clock=lambda: __import__('time').time()+901
        assert case.request(body={'control':'pool','operation':'on'},headers=headers)[0]==403
        case.ha.assert_not_called()
    print('Cross-application gateway verified with mocked equipment')
finally:
    case.doCleanups()
`;
 const result=spawnSync(process.env.PYTHON_BINARY||'python3',['-c',script,process.env.POOL_SOURCE,ticket,secret],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/Cross-application gateway verified/);
 assert.equal(result.stdout.includes(ticket),false);
});
