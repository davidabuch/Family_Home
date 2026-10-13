import test from 'node:test';
import assert from 'node:assert/strict';
import {isSecureTransport} from '../lib/transport.js';
const req=(ip,proto,encrypted=false)=>({socket:{remoteAddress:ip,encrypted},headers:{'x-forwarded-proto':proto}});
const trusted=new Set(['172.30.0.5']);
test('direct TLS is accepted',()=>assert.equal(isSecureTransport(req('203.0.113.8',undefined,true)),true));
test('trusted NPM peer with exactly HTTPS is accepted without shared secret',()=>assert.equal(isSecureTransport(req('172.30.0.5','https'),trusted),true));
test('untrusted client cannot forge forwarded HTTPS',()=>{
 assert.equal(isSecureTransport(req('203.0.113.8','https'),trusted),false);
 assert.equal(isSecureTransport(req('192.168.1.20','https'),trusted),false);
 assert.equal(isSecureTransport(req('172.30.0.5','https')),false);
});
test('trusted peer forwarding plain HTTP is rejected',()=>assert.equal(isSecureTransport(req('172.30.0.5','http'),trusted),false));
test('ambiguous or absent forwarded protocol is rejected',()=>{
 for(const proto of ['http,https','https,http','https, https',undefined,['https','http'],42]){
  assert.equal(isSecureTransport(req('172.30.0.5',proto),trusted),false);
 }
});
test('missing peer and direct plain HTTP are rejected',()=>{
 assert.equal(isSecureTransport(req(undefined,'https'),trusted),false);
 assert.equal(isSecureTransport(req('203.0.113.8','http')),false);
});
