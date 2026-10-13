import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {issuePoolTicket,poolDestination} from '../lib/pool-handoff.js';
const secret='mock-only-handoff-secret-at-least-32-characters';
const session={id:'session-hash',expires:2000000,user:{id:'admin-id',role:'admin',enabled:true}};
test('administrator tickets match the existing verifier format and are unique',()=>{
 const first=issuePoolTicket(session,secret,1000000),second=issuePoolTicket(session,secret,1000000);
 const [payload,signature]=first.split('.'),claims=JSON.parse(Buffer.from(payload,'base64url'));
 assert.equal(signature,createHmac('sha256',secret).update(payload).digest('base64url'));
 assert.deepEqual({...claims,nonce:'random'}, {aud:'pool-spa-family',sub:'admin-id',role:'admin',exp:1060,nonce:'random',sid:'session-hash'});
 assert.match(claims.nonce,/^[a-f0-9]{48}$/);assert.notEqual(first,second);
});
test('members, disabled users, expired accounts/sessions and missing secrets cannot issue tickets',()=>{
 for(const value of [null,{...session,user:{...session.user,role:'member'}},{...session,user:{...session.user,enabled:false}},
  {...session,expires:999999},{...session,user:{...session.user,expires_at:new Date(999999).toISOString()}}]){
  assert.throws(()=>issuePoolTicket(value,secret,1000000));
 }
 assert.throws(()=>issuePoolTicket(session,'short',1000000));
});
test('destinations are fixed HTTPS origins; remote cannot enter local boundary',()=>{
 const config={homeOrigin:'https://home-local.davidbuchmd.com',remoteHomeOrigin:'https://home.davidbuchmd.com',remotePoolOrigin:'https://pool.davidbuchmd.com'};
 assert.equal(poolDestination(config.homeOrigin,config),'https://pool-local.davidbuchmd.com');
 assert.equal(poolDestination(config.remoteHomeOrigin,config),config.remotePoolOrigin);
 assert.equal(poolDestination('https://evil.test',config),null);
 assert.equal(poolDestination(config.homeOrigin,{...config,poolOrigin:'https://pool.davidbuchmd.com'}),null);
 for(const remotePoolOrigin of ['', 'https://pool-local.davidbuchmd.com','https://pool.davidbuchmd.com/path','http://pool.davidbuchmd.com','https://pool.davidbuchmd.com/?ticket=x','https://evil.test']){
  assert.equal(poolDestination(config.remoteHomeOrigin,{...config,remotePoolOrigin}),null);
 }
});
