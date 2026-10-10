import test from 'node:test';
import assert from 'node:assert/strict';
import {isSecureTransport} from '../lib/transport.js';
const req=(ip,proto,encrypted=false)=>({socket:{remoteAddress:ip,encrypted},headers:{'x-forwarded-proto':proto}});
test('direct TLS is accepted',()=>assert.equal(isSecureTransport(req('203.0.113.8',undefined,true)),true));
test('spoofed HTTPS forwarding from untrusted peer is rejected',()=>assert.equal(isSecureTransport(req('203.0.113.8','https'),new Set(['172.30.0.5'])),false));
test('plain HTTP is rejected even from trusted peer',()=>assert.equal(isSecureTransport(req('172.30.0.5','http'),new Set(['172.30.0.5'])),false));
test('trusted peer must explicitly forward one HTTPS protocol',()=>{
 const trusted=new Set(['172.30.0.5']);
 assert.equal(isSecureTransport(req('172.30.0.5','https'),trusted),true);
 assert.equal(isSecureTransport(req('172.30.0.5','http,https'),trusted),false);
 assert.equal(isSecureTransport(req('172.30.0.5',undefined),trusted),false);
 assert.equal(isSecureTransport(req('172.30.0.5',['https','http']),trusted),false);
});
