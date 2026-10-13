import test from 'node:test';
import assert from 'node:assert/strict';
import {seedAlexis,validateProfile,profileEntities,permitted,allowedActions,sanitizeProfile} from '../lib/profiles.js';
test('Alexis migration preserves rooms and scoped devices',()=>{
 const p=seedAlexis();assert.equal(validateProfile(p),true);
 assert.deepEqual(p.rooms.map(r=>r.id),['room','shared','oliver']);
 assert.ok(profileEntities(p).has('cover.olivers_room_shade'));
 assert.ok(permitted(p,'light.kitchen_kitchen_main_lights','turn_on'));
 assert.ok(!permitted(p,'light.kitchen_cabinet_lights','turn_on'));
});
test('alarm, locks, cameras and unassigned devices are always denied',()=>{
 const p=seedAlexis();
 for(const e of ['alarm_control_panel.los_angeles_alarm','lock.front_door','camera.front_door']){
  assert.deepEqual(allowedActions(e),[]);
  assert.equal(permitted(p,e,'turn_on'),false);
 }
});
test('unsupported commands cannot be added',()=>{
 const p=seedAlexis();
 p.rooms[0].devices[0].actions=['alarm_disarm'];
 assert.throws(()=>validateProfile(p));
});
test('duplicate entity across rooms is rejected',()=>{
 const p=seedAlexis();p.rooms[1].devices.push({...p.rooms[0].devices[0]});
 assert.throws(()=>validateProfile(p));
});
test('accessory capability gates brightness and shade position',()=>{
 assert.deepEqual(allowedActions('light.bathroom',{supported_color_modes:['onoff']}),['turn_on','turn_off']);
 assert.ok(allowedActions('light.bedroom',{supported_color_modes:['brightness']}).includes('set_brightness'));
 assert.ok(!allowedActions('cover.shade',{supported_features:3}).includes('set_position'));
});
test('copying a profile produces independent editable room assignments',()=>{
 const original=seedAlexis(),copy=sanitizeProfile(original);
 copy.rooms[0].devices[0].name='Changed';
 assert.notEqual(copy.rooms[0].devices[0].name,original.rooms[0].devices[0].name);
});

test('cover commands are individually gated by live supported_features',()=>{
 assert.deepEqual(allowedActions('cover.partial',{supported_features:1}),['open_cover']);
 assert.deepEqual(allowedActions('cover.partial',{supported_features:2}),['close_cover']);
 assert.deepEqual(allowedActions('cover.partial',{supported_features:4}),['set_position']);
 assert.deepEqual(allowedActions('cover.partial',{supported_features:8}),['stop_cover']);
 assert.deepEqual(allowedActions('cover.full',{supported_features:15}),['open_cover','close_cover','stop_cover','set_position']);
});
test('fan percentage requires live speed support',()=>{
 assert.deepEqual(allowedActions('fan.fixed',{supported_features:0}),['turn_on','turn_off']);
 assert.ok(allowedActions('fan.speed',{supported_features:1}).includes('set_percentage'));
});

test('Family Music link is restricted to signed-in Alexis and Kaelah',async()=>{
 const {readFile}=await import('node:fs/promises');
 const js=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 assert.match(js,/\['alexis','kaelah'\]\.includes\(me\.username\.toLowerCase\(\)\)/);
 assert.match(js,/https:\/\/music\.davidbuchmd\.com\//);
 assert.match(js,/link\.rel='noopener noreferrer'/);
 assert.doesNotMatch(html,/music\.davidbuchmd\.com/);
});

test('Pool link visibility persists independently of equipment permissions',()=>{
 const profile=seedAlexis();
 for(const show_pool of [true,false]){
  const copy=sanitizeProfile({...profile,show_pool});assert.equal(copy.show_pool,show_pool);
  assert.deepEqual([...profileEntities(copy)],[...profileEntities(profile)]);
  assert.equal(permitted(copy,'climate.pool_thermostat','turn_on'),false);
 }
});


test('Pool navigation does not transfer Family Home administrator credentials',async()=>{
 const {readFile}=await import('node:fs/promises');
 const js=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(js,/poolLink\.href=me\.pool_origin\+'\\/'/);
 assert.match(js,/poolLink\.onclick=null/);
 assert.doesNotMatch(js,/openPoolAdministrator\(/);
});
