export const ALLOWED = Object.freeze({
  'light.alexis_room_alexis_room_main_lights':['turn_on','turn_off','set_brightness'],
  'light.alexis_room_alexis_bathroom_lights':['turn_on','turn_off','set_brightness'],
  'light.alexis_room_alexis_bathroom_nightlight':['turn_on','turn_off','set_brightness'],
  'fan.alexis_room_alexis_room_ceiling_fan':['turn_on','turn_off','set_percentage'],
  'switch.alexis_room_alexis_bathroom_fan':['turn_on','turn_off','set_brightness'],
  'cover.alexis_window_shade':['open_cover','close_cover','stop_cover','set_position'],
  'light.kitchen_kitchen_main_lights':['turn_on','turn_off','set_brightness'],
  'light.living_room_living_room_main_lights':['turn_on','turn_off','set_brightness'],
  'light.dining_room_dining_room_main_lights_1':['turn_on','turn_off','set_brightness'],
  'light.olivers_room_olivers_room_main_lights':['turn_on','turn_off','set_brightness'],
  'light.olivers_room_olivers_bathroom_lights':['turn_on','turn_off'],
  'light.olivers_room_olivers_night_light':['turn_on','turn_off'],
  'fan.olivers_room_olivers_room_ceiling_fan':['turn_on','turn_off','set_percentage'],
  'cover.olivers_room_shade':['open_cover','close_cover','stop_cover','set_position']
});
export const READ_ONLY = Object.freeze([]);
export const VISIBLE = Object.freeze([...Object.keys(ALLOWED)]);
export function authorize(entity,action){return Object.hasOwn(ALLOWED,entity)&&ALLOWED[entity].includes(action)&&!(action==='set_brightness'&&!['light.alexis_room_alexis_room_main_lights','light.kitchen_kitchen_main_lights','light.living_room_living_room_main_lights','light.dining_room_dining_room_main_lights_1','light.olivers_room_olivers_room_main_lights'].includes(entity))}
export function serviceFor(entity,action){if(!authorize(entity,action))return null;return {domain:entity.split('.')[0],service:action==='set_brightness'?'turn_on':action==='set_position'?'set_cover_position':action}}
