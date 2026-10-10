import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
const TTL=30*24*60*60*1000;
export function passwordHash(password){
 if(typeof password!=='string'||password.length<12||password.length>256)throw Error('Password must be 12-256 characters');
 const salt=randomBytes(16).toString('hex');
 return 'scrypt:'+salt+':'+scryptSync(password,salt,64).toString('hex');
}
export function passwordMatches(password,stored){
 if(typeof password!=='string'||typeof stored!=='string')return false;
 const parts=stored.split(':');if(parts.length!==3||parts[0]!=='scrypt'||!/^[a-f0-9]{32}$/.test(parts[1])||!/^[a-f0-9]{128}$/.test(parts[2]))return false;
 const actual=scryptSync(password,parts[1],64),expected=Buffer.from(parts[2],'hex');
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
export function sessionHash(raw){return createHash('sha256').update(raw).digest('hex')}
export function createSession(db,userId,{secure=false,now=Date.now()}={}){
 if(!secure)throw Error('Persistent sessions require HTTPS');
 const token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');
 const session={id:sessionHash(token),user_id:userId,csrf,expires:now+TTL,created_at:now};
 db.sessions.push(session);
 return {token,csrf,session};
}
export function resolveSession(db,token,now=Date.now()){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return null;
 const session=db.sessions.find(s=>s.id===sessionHash(token)&&s.expires>now);
 if(!session)return null;
 const user=db.users.find(u=>u.id===session.user_id&&u.enabled!==false&&(!u.expires_at||Date.parse(u.expires_at)>now));
 return user?{user,session}:null;
}
export function revokeUserSessions(db,userId){db.sessions=db.sessions.filter(s=>s.user_id!==userId)}
export function pruneSessions(db,now=Date.now()){db.sessions=db.sessions.filter(s=>s.expires>now)}
