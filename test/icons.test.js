import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('approved icons are identical for local and remote hosts and preserve API boundaries',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'family-home-icons-'));
 let equipmentRequests=0;
 const ha=http.createServer((req,res)=>{equipmentRequests++;res.writeHead(500);res.end('Equipment requests forbidden');});
 ha.listen(0,'127.0.0.1');await once(ha,'listening');
 const child=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{
  PORT:'0',HA_URL:'http://127.0.0.1:'+ha.address().port,HA_TOKEN:'mock-test-token',
  SESSION_SECRET:'mock-session-secret-for-icons-tests-only',FAMILY_HOME_DB_PATH:join(directory,'db.json')
 },stdio:['ignore','pipe','pipe']});
 t.after(async()=>{child.kill();if(child.exitCode===null)await once(child,'exit');await new Promise(resolve=>ha.close(resolve));await rm(directory,{recursive:true,force:true});});
 const port=await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('Test server did not start')),10000);
  child.once('exit',()=>{clearTimeout(timeout);reject(Error('Test server exited before startup'));});
  let output='';child.stdout.on('data',data=>{output+=data;const match=output.match(/Family Home listening on (\d+)/);if(match){clearTimeout(timeout);resolve(Number(match[1]));}});
 });
 const request=(path,host,method='GET')=>new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port,path,method,headers:{Host:host}},res=>{
   const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
  });req.on('error',reject);req.end();
 });
 const local='home-local.davidbuchmd.com',remote='home.davidbuchmd.com';
 const response=await request('/manifest.webmanifest',local);
 const manifest=JSON.parse(response.body);
 assert.deepEqual(manifest.icons.map(icon=>icon.sizes),['192x192','512x512']);
 for(const page of ['/','/admin.html']){
  const html=(await request(page,remote)).body.toString();
  assert.match(html,/rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon.png\?v=approved-v2"/);
  assert.match(html,/rel="icon" type="image\/png" sizes="32x32"/);
  assert.doesNotMatch(html,/icon\.svg|approved-v1/);
  assert.match(html,/rel="apple-touch-icon-precomposed"/);
 }
 for(const size of [16,32,180,192,512]){
  const path='/icons/approved-v2/icon-'+size+'.png';
  const a=await request(path+'?local',local),b=await request(path+'?remote',remote);
  assert.equal(a.status,200);assert.equal(a.headers['content-type'],'image/png');
  assert.equal(a.headers['x-content-type-options'],'nosniff');
  assert.equal(a.headers['cache-control'],'no-store');
  assert.deepEqual(a.body,b.body);
  assert.deepEqual(a.body,await readFile(new URL('../public'+path,import.meta.url)));
  assert.equal(a.body.readUInt32BE(16),size);assert.equal(a.body.readUInt32BE(20),size);
 }
 const favicon=await request('/favicon.ico',remote);
 assert.equal(favicon.status,200);assert.equal(favicon.headers['content-type'],'image/x-icon');
 assert.deepEqual(favicon.body,await readFile(new URL('../public/icons/approved-v2/favicon.ico',import.meta.url)));
 for(const path of ['/apple-touch-icon.png','/apple-touch-icon-precomposed.png']){
  const expected=await readFile(new URL('../public/icons/approved-v2/icon-180.png',import.meta.url));
  for(const query of ['', '?v=approved-v2']){
   const a=await request(path+query,local),b=await request(path+query,remote);
   assert.equal(a.status,200);assert.equal(b.status,200);
   assert.equal(a.headers['content-type'],'image/png');
   assert.equal(a.headers['cache-control'],'no-store');
   assert.deepEqual(a.body,expected);assert.deepEqual(b.body,expected);
  }
 }
 assert.equal((await request('/icons/approved-v2/..%2F..%2Fserver.js',local)).status,426);
 assert.equal((await request('/api/profile',local)).status,426);
 assert.equal((await request('/api/login',remote,'POST')).status,426);
 assert.equal(equipmentRequests,0);
});
