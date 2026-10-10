import test from 'node:test';
import assert from 'node:assert/strict';
import {createUser,setProfile,disableUser,changePassword,listUsers} from '../lib/admin.js';
import {seedAlexis} from '../lib/profiles.js';
import {passwordMatches} from '../lib/auth.js';
const admin={id:'admin',role:'admin',enabled:true};
function database(){return {schema:1,users:[{id:'admin',username:'owner',role:'admin',enabled:true,password_hash:'seed'}],profiles:{alexis:seedAlexis()},sessions:[]}}
test('only admins can create users and edit device access',()=>{
 const db=database();
 assert.throws(()=>createUser(db,{id:'alexis',role:'member'},{username:'other',password:'long strong password',display_name:'Other'}));
 const u=createUser(db,admin,{username:'other',password:'long strong password',display_name:'Other',copy_from:'alexis'});
 assert.equal(listUsers(db,admin).length,2);
 assert.equal(db.profiles[u.id].rooms.length,3);
 const profile=db.profiles[u.id];profile.rooms[0].devices.splice(0,1);
 setProfile(db,admin,u.id,profile);
 assert.equal(db.profiles[u.id].rooms[0].devices.length,5);
 assert.equal(db.profiles.alexis.rooms[0].devices.length,6);
});
test('disabling a user revokes their sessions',()=>{
 const db=database(),u=createUser(db,admin,{username:'member',password:'long strong password',display_name:'Member'});
 db.sessions.push({user_id:u.id,id:'fake',expires:Date.now()+5000});
 disableUser(db,admin,u.id);
 assert.equal(db.sessions.length,0);assert.equal(db.users.find(x=>x.id===u.id).enabled,false);
 assert.throws(()=>disableUser(db,admin,'admin'));
});
test('password reset revokes sessions',()=>{
 const db=database(),u=createUser(db,admin,{username:'member',password:'long strong password',display_name:'Member'});
 db.sessions.push({user_id:u.id,id:'fake',expires:Date.now()+5000});
 changePassword(db,admin,u.id,'another long passphrase');
 assert.equal(db.sessions.length,0);
 assert.ok(passwordMatches('another long passphrase',db.users.find(x=>x.id===u.id).password_hash));
});
test('guest must have future expiration',()=>{
 const db=database();
 assert.throws(()=>createUser(db,admin,{username:'guest',password:'long strong password',display_name:'Guest',role:'guest'}));
});

test('new members and guests are not remote eligible by default',()=>{
 const db=database();
 const member=createUser(db,admin,{username:'localmember',password:'long strong password',display_name:'Local Member'});
 const guest=createUser(db,admin,{username:'localguest',password:'long strong password',display_name:'Local Guest',role:'guest',expires_at:new Date(Date.now()+86400000).toISOString()});
 assert.equal(db.users.find(u=>u.id===member.id).remote_access,false);
 assert.equal(db.users.find(u=>u.id===guest.id).remote_access,false);
 assert.equal(listUsers(db,admin).find(u=>u.id===member.id).remote_access,false);
});
