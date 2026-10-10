import test from 'node:test';
import assert from 'node:assert/strict';
import {passwordHash,passwordMatches,createSession,resolveSession,revokeUserSessions,sessionHash} from '../lib/auth.js';
test('passwords use unique salts and verify correctly',()=>{
 const a=passwordHash('long unique passphrase'),b=passwordHash('long unique passphrase');
 assert.notEqual(a,b);assert.ok(passwordMatches('long unique passphrase',a));
 assert.equal(passwordMatches('wrong password',a),false);
 assert.equal(passwordMatches('long unique passphrase','garbage'),false);
 assert.throws(()=>passwordHash('short'));
});
test('persistent session never allowed over HTTP',()=>{
 const db={users:[],sessions:[]};
 assert.throws(()=>createSession(db,'alexis',{secure:false}));
 assert.equal(db.sessions.length,0);
});
test('sessions are hashed at rest, scoped, expiring, and revocable',()=>{
 const now=1700000000000,db={users:[{id:'alexis',role:'member',enabled:true},{id:'guest',role:'guest',enabled:true,expires_at:new Date(now+10000).toISOString()}],sessions:[]};
 const {token,session}=createSession(db,'alexis',{secure:true,now});
 assert.notEqual(token,session.id);assert.equal(sessionHash(token),session.id);
 assert.equal(resolveSession(db,token,now)?.user.id,'alexis');
 assert.equal(resolveSession(db,token,now+31*86400000),null);
 revokeUserSessions(db,'alexis');assert.equal(resolveSession(db,token,now),null);
 const guest=createSession(db,'guest',{secure:true,now});
 assert.equal(resolveSession(db,guest.token,now+11000),null);
});
