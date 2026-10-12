// Family Home multi-user configuration and permission policy.
// This module is intentionally independent of HTTP and persistence so it can be tested.
export const SUPPORTED_DOMAINS=Object.freeze(['light','fan','switch','cover']);
export const FORBIDDEN_DOMAINS=Object.freeze(['alarm_control_panel','lock','camera']);
const ENTITY_RE=/^(light|fan|switch|cover)\.[a-z0-9_]+$/;
const ACTIONS={
 light:['turn_on','turn_off','set_brightness'],
 fan:['turn_on','turn_off','set_percentage'],
 switch:['turn_on','turn_off'],
 cover:['open_cover','close_cover','stop_cover','set_position']
};
export function allowedActions(entity,attributes={}){
 if(typeof entity!=='string'||!ENTITY_RE.test(entity))return [];
 const domain=entity.split('.')[0];
 const features=Number(attributes.supported_features||0);
 if(domain==='light'){
  const modes=Array.isArray(attributes.supported_color_modes)?attributes.supported_color_modes:[];
  return modes.some(m=>m==='brightness'||m==='color_temp'||m==='hs'||m==='xy'||m==='rgb'||m==='rgbw'||m==='rgbww'||m==='white')?ACTIONS.light:[...ACTIONS.light.slice(0,2)];
 }
 if(domain==='cover'){
  return [
   ...(features&1?['open_cover']:[]),
   ...(features&2?['close_cover']:[]),
   ...(features&8?['stop_cover']:[]),
   ...(features&4?['set_position']:[])
  ];
 }
 if(domain==='fan')return features&1?[...ACTIONS.fan]:ACTIONS.fan.slice(0,2);
 return [...ACTIONS[domain]];
}
export function validateProfile(profile){
 if(!profile||typeof profile!=='object'||!Array.isArray(profile.rooms))throw Error('Invalid profile');
 if(profile.rooms.length>30)throw Error('Too many rooms');
 const roomIds=new Set(),entities=new Set();
 for(const room of profile.rooms){
  if(!room||typeof room.id!=='string'||!/^[-a-z0-9_]{1,40}$/.test(room.id)||roomIds.has(room.id)||typeof room.name!=='string'||room.name.length>60||!Array.isArray(room.devices)||room.devices.length>100)throw Error('Invalid room');
  roomIds.add(room.id);
  for(const device of room.devices){
   if(!device||typeof device.entity_id!=='string'||!ENTITY_RE.test(device.entity_id)||entities.has(device.entity_id)||typeof device.name!=='string'||!device.name.trim()||device.name.length>70||!Array.isArray(device.actions)||device.actions.some(a=>!ACTIONS[device.entity_id.split('.')[0]].includes(a)))throw Error('Invalid accessory');
   if(device.actions.length!==new Set(device.actions).size)throw Error('Duplicate action');
   entities.add(device.entity_id);
  }
 }
 return true;
}
export function profileEntities(profile){validateProfile(profile);return new Set(profile.rooms.flatMap(r=>r.devices.map(d=>d.entity_id)))}
export function permitted(profile,entity,action){
 if(!profile||typeof action!=='string')return false;
 const device=profile.rooms?.flatMap(r=>r.devices||[]).find(d=>d.entity_id===entity);
 return Boolean(device?.actions?.includes(action)&&ACTIONS[entity?.split('.')[0]]?.includes(action));
}
export function sanitizeProfile(profile){validateProfile(profile);return {show_music:profile.show_music===true,rooms:profile.rooms.map(r=>({id:r.id,name:r.name,devices:r.devices.map(d=>({entity_id:d.entity_id,name:d.name,actions:[...d.actions]}))}))}}
export function seedAlexis(){
 const device=(entity_id,name,actions)=>({entity_id,name,actions});
 return {show_music:true,rooms:[
  {id:'room',name:'My Room',devices:[
   device('light.alexis_room_alexis_room_main_lights','Main Lights',ACTIONS.light),
   device('light.alexis_room_alexis_bathroom_lights','Bathroom Lights',ACTIONS.light.slice(0,2)),
   device('light.alexis_room_alexis_bathroom_nightlight','Bathroom Nightlight',ACTIONS.light.slice(0,2)),
   device('fan.alexis_room_alexis_room_ceiling_fan','Ceiling Fan',ACTIONS.fan),
   device('switch.alexis_room_alexis_bathroom_fan','Bathroom Fan',ACTIONS.switch),
   device('cover.alexis_window_shade','Window Shade',ACTIONS.cover)
  ]},
  {id:'shared',name:'Shared Areas',devices:[
   device('light.kitchen_kitchen_main_lights','Kitchen Main',ACTIONS.light),
   device('light.living_room_living_room_main_lights','Living Room Main',ACTIONS.light),
   device('light.dining_room_dining_room_main_lights_1','Dining Room Main',ACTIONS.light)
  ]},
  {id:'oliver',name:"Oliver's Room",devices:[
   device('light.olivers_room_olivers_room_main_lights',"Oliver's Main Lights",ACTIONS.light),
   device('light.olivers_room_olivers_bathroom_lights','Bathroom Lights',ACTIONS.light.slice(0,2)),
   device('light.olivers_room_olivers_night_light','Night Light',ACTIONS.light.slice(0,2)),
   device('fan.olivers_room_olivers_room_ceiling_fan','Ceiling Fan',ACTIONS.fan),
   device('cover.olivers_room_shade','Window Shade',ACTIONS.cover)
  ]}
 ]};
}
