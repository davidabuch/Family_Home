export const ALLOWED = Object.freeze({
  'light.alexis_room_alexis_room_main_lights':['turn_on','turn_off'],
  'light.alexis_room_alexis_bathroom_lights':['turn_on','turn_off'],
  'light.alexis_room_alexis_bathroom_nightlight':['turn_on','turn_off'],
  'fan.alexis_room_alexis_room_ceiling_fan':['turn_on','turn_off'],
  'switch.alexis_room_alexis_bathroom_fan':['turn_on','turn_off'],
  'cover.alexis_window_shade':['open_cover','close_cover','stop_cover'],
  'light.kitchen_kitchen_main_lights':['turn_on','turn_off'],
  'light.living_room_living_room_main_lights':['turn_on','turn_off'],
  'light.dining_room_dining_room_main_lights_1':['turn_on','turn_off'],
  'light.olivers_room_olivers_room_main_lights':['turn_on','turn_off'],
  'alarm_control_panel.los_angeles_alarm':['alarm_arm_home','alarm_arm_away','alarm_disarm']
});
export const READ_ONLY = Object.freeze([
 'binary_sensor.alexis_window_left','binary_sensor.alexis_window_right',
 'binary_sensor.alexis_bathroom_window','binary_sensor.alexis_glass_door'
]);
export const VISIBLE = Object.freeze([...Object.keys(ALLOWED),...READ_ONLY]);
export function authorize(entity,action){return Object.hasOwn(ALLOWED,entity)&&ALLOWED[entity].includes(action)}
export function serviceFor(entity,action){if(!authorize(entity,action))return null;return {domain:entity.split('.')[0],service:action}}
