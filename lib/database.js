import {readFile,writeFile,rename,mkdir,copyFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {randomBytes} from 'node:crypto';
import {sanitizeProfile,seedAlexis} from './profiles.js';

// This file is stored on the Home Assistant App's persistent /data volume.
// Never write the database to the checked-out source tree or Docker image.
export async function loadDatabase(path,legacyUsername){
 try{
  const db=JSON.parse(await readFile(path,'utf8'));
  validateDatabase(db);
  return {db,migrated:false};
 }catch(err){
  if(err.code!=='ENOENT')throw err; // fail closed on corrupt files; never reset accounts
  const db={schema:1,users:[],profiles:{},sessions:[],created_at:new Date().toISOString()};
  // A legacy user is staged but not enabled until credentials are migrated safely.
  // Migration code must supply the existing hash; never create a blank-password user.
  db.profiles[legacyUsername]=seedAlexis();
  return {db,migrated:true};
 }
}
export function validateDatabase(db){
 if(!db||db.schema!==1||!Array.isArray(db.users)||!db.profiles||typeof db.profiles!=='object'||!Array.isArray(db.sessions))throw Error('Unsupported Family Home database');
 for(const p of Object.values(db.profiles))sanitizeProfile(p);
 const ids=new Set();
 for(const user of db.users){
  if(typeof user.id!=='string'||ids.has(user.id)||!['admin','member','guest'].includes(user.role)||typeof user.password_hash!=='string'||!user.password_hash)throw Error('Invalid user');
  ids.add(user.id);
 }
 return true;
}
export async function saveDatabase(path,db){
 validateDatabase(db);
 await mkdir(dirname(path),{recursive:true,mode:0o700});
 const tmp=path+'.'+randomBytes(8).toString('hex')+'.tmp';
 await writeFile(tmp,JSON.stringify(db,null,2),{encoding:'utf8',mode:0o600,flag:'wx'});
 await rename(tmp,path);
}
export async function backupDatabase(path){
 const destination=path+'.backup-'+new Date().toISOString().replace(/[:.]/g,'-');
 await copyFile(path,destination);
 return destination;
}
