import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../public/pool-handoff.js',import.meta.url),'utf8');
const destination='https://pool-local.davidbuchmd.com';
function setup({blocked=false,mismatch=false,rejected=false}={}){
 const messages=[],errors=[],calls=[],listeners=new Map();
 const child={postMessage:(message,origin)=>messages.push({message,origin})};
 const window={open:(url,target)=>{calls.push({url,target});return blocked?null:child},addEventListener:(t,f)=>listeners.set(t,f),removeEventListener:t=>listeners.delete(t)};
 vm.runInNewContext(script,{window,setTimeout:()=>1,clearTimeout:()=>{}});
 window.openPoolAdministrator(destination,async(endpoint,options)=>{
  calls.push({endpoint,options});if(rejected)throw Error('Rejected');
  return {ticket:'mock-ticket',pool_origin:mismatch?'https://evil.test':destination};
 },error=>errors.push(error));
 return {messages,errors,calls,listeners,child};
}
test('only the opened Pool origin can request administrator issuance',async()=>{
 const r=setup(),receive=r.listeners.get('message');
 await receive({origin:'https://evil.test',source:r.child,data:{type:'pool-admin-ready'}});
 await receive({origin:destination,source:{},data:{type:'pool-admin-ready'}});
 assert.equal(r.calls.length,1);
 await receive({origin:destination,source:r.child,data:{type:'pool-admin-ready'}});
 assert.equal(r.calls[1].endpoint,'pool-admin-handoff');assert.equal(r.calls[1].options.method,'POST');
 assert.equal(r.messages[0].origin,destination);assert.equal(r.messages[0].message.ticket,'mock-ticket');
 await receive({origin:destination,source:r.child,data:{type:'pool-admin-ready'}});
 assert.equal(r.calls.length,2,'No duplicate issuance');
 await receive({origin:destination,source:r.child,data:{type:'pool-admin-complete'}});assert.equal(r.listeners.size,0);
});
test('blocked popup, rejected issuance and destination mismatch fail closed',async()=>{
 for(const options of [{blocked:true},{mismatch:true},{rejected:true}]){
  const r=setup(options);if(!options.blocked)await r.listeners.get('message')({origin:destination,source:r.child,data:{type:'pool-admin-ready'}});
  assert.equal(r.messages.length,0);assert.equal(r.errors.length,1);
 }
});
