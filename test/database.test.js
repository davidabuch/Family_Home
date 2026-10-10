import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadDatabase,saveDatabase,backupDatabase} from '../lib/database.js';
test('fresh installation seeds Alexis profile but no passwordless accounts',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'family-home-'));
 try{
  const file=join(dir,'db.json');
  const {db,migrated}=await loadDatabase(file,'Alexis');
  assert.equal(migrated,true);assert.equal(db.users.length,0);
  assert.equal(db.profiles.Alexis.rooms.length,3);
  await saveDatabase(file,db);
  const loaded=await loadDatabase(file,'Alexis');
  assert.equal(loaded.migrated,false);
  assert.equal(loaded.db.profiles.Alexis.rooms.length,3);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('corrupt database fails closed rather than resetting permissions',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'family-home-'));
 try{
  const file=join(dir,'db.json');
  await writeFile(file,'{corrupt');
  await assert.rejects(loadDatabase(file,'Alexis'));
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('persistent data rejects malformed profiles',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'family-home-'));
 try{
  const file=join(dir,'db.json');
  const {db}=await loadDatabase(file,'Alexis');
  db.profiles.Alexis.rooms[0].devices.push({entity_id:'alarm_control_panel.alarm',name:'Alarm',actions:['turn_on']});
  await assert.rejects(saveDatabase(file,db));
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('database backup preserves content and private permissions',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'family-home-'));
 try{
  const file=join(dir,'db.json');
  const {db}=await loadDatabase(file,'Alexis');
  await saveDatabase(file,db);
  const backup=await backupDatabase(file);
  assert.deepEqual(JSON.parse(await readFile(backup,'utf8')),db);
  assert.equal((await stat(backup)).mode&0o777,0o600);
  assert.equal((await stat(file)).mode&0o777,0o600);
 }finally{await rm(dir,{recursive:true,force:true})}
});
