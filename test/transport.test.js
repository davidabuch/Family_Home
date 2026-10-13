import test from 'node:test';
import assert from 'node:assert/strict';
import {isSecureTransport} from '../lib/transport.js';
const secret='mock-only-proxy-secret-at-least-32-characters';
const req=(ip,proto,encrypted=false)=>({socket:{remoteAddress:ip,encrypted},headers:{'x-forwarded-proto':proto,'x-family-proxy-secret':secret}});
test('direct TLS is accepted',()=>assert.equal(isSecureTransport(req('203.0.113.8',undefined,true)),true));
test('spoofed HTTPS forwarding from untrusted peer is rejected',()=>assert.equal(isSecureTransport(req('203.0.113.8','https'),new Set(['172.30.0.5']),secret),false));
test('plain HTTP is rejected even from trusted peer',()=>assert.equal(isSecureTransport(req('172.30.0.5','http'),new Set(['172.30.0.5']),secret),false));
test('trusted peer must explicitly forward one HTTPS protocol',()=>{
 const trusted=new Set(['172.30.0.5']);
 assert.equal(isSecureTransport(req('172.30.0.5','https'),trusted,secret),true);
 assert.equal(isSecureTransport(req('172.30.0.5','http,https'),trusted,secret),false);
 assert.equal(isSecureTransport(req('172.30.0.5',undefined),trusted,secret),false);
 assert.equal(isSecureTransport(req('172.30.0.5',['https','http']),trusted,secret),false);
});

test('trusted peer without a matching proxy secret fails closed',()=>{
 const trusted=new Set(['172.30.0.5']);
 assert.equal(isSecureTransport(req('172.30.0.5','https'),trusted),false);
 assert.equal(isSecureTransport(req('172.30.0.5','https'),trusted,'different-long-proxy-secret-123456'),false);
});
