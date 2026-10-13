import {randomUUID} from 'node:crypto';
import {passwordHash,revokeUserSessions} from './auth.js';
import {sanitizeProfile} from './profiles.js';
const USER_RE=/^[a-z][a-z0-9._-]{2,31}$/;
export function requireAdmin(actor){if(!actor||actor.role!=='admin'||actor.enabled===false)throw Error('Administrator required')}
export function createUser(db,actor,{username,password,role='member',display_name,copy_from,expires_at}){
 requireAdmin(actor);
 if(typeof username!=='string'||!USER_RE.test(username)||db.users.some(u=>u.username===username))throw Error('Invalid or duplicate username');
 if(!['member','guest'].includes(role))throw Error('Invalid role');
 if(typeof display_name!=='string'||!display_name.trim()||display_name.length>80)throw Error('Invalid name');
 if(role==='guest'&&(!expires_at||!Number.isFinite(Date.parse(expires_at))||Date.parse(expires_at)<=Date.now()))throw Error('Guest expiry required');
 const source=copy_from?db.profiles[copy_from]:null;
 if(copy_from&&!source)throw Error('Copy source missing');
 const user={id:randomUUID(),username,display_name,role,password_hash:passwordHash(password),enabled:true,remote_access:false,...(role==='guest'?{expires_at}:{})};
 db.users.push(user);
 db.profiles[user.id]=source?{...sanitizeProfile(source),show_music:false,show_pool:false}:{rooms:[],show_music:false,show_pool:false};
 return {id:user.id,username:user.username,display_name:user.display_name,role:user.role};
}
export function setProfile(db,actor,userId,profile){
 requireAdmin(actor);
 if(!db.users.some(u=>u.id===userId))throw Error('Unknown user');
 db.profiles[userId]=sanitizeProfile(profile);
}
export function disableUser(db,actor,userId){
 requireAdmin(actor);
 const target=db.users.find(u=>u.id===userId);
 if(!target)throw Error('Unknown user');
 if(target.id===actor.id)throw Error('Cannot disable own admin account');
 if(target.role==='admin')throw Error('Cannot disable administrator here');
 target.enabled=false;revokeUserSessions(db,userId);
}
export function changePassword(db,actor,userId,password){
 requireAdmin(actor);
 const target=db.users.find(u=>u.id===userId);
 if(!target)throw Error('Unknown user');
 target.password_hash=passwordHash(password);revokeUserSessions(db,userId);
}
export function listUsers(db,actor){
 requireAdmin(actor);
 return db.users.map(({id,username,display_name,role,enabled,expires_at,remote_access})=>({id,username,display_name,role,enabled,expires_at,remote_access:remote_access===true}));
}
