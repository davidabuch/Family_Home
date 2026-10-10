import test from 'node:test';import assert from 'node:assert/strict';import {authorize,READ_ONLY,VISIBLE,serviceFor} from '../lib/permissions.js';
test('alarm actions and state are completely excluded',()=>{for(const a of ['alarm_arm_home','alarm_arm_away','alarm_disarm'])assert.equal(authorize('alarm_control_panel.los_angeles_alarm',a),false);assert.equal(VISIBLE.includes('alarm_control_panel.los_angeles_alarm'),false)});
test('no cabinet light access',()=>assert.equal(authorize('light.kitchen_cabinet_lights','turn_on'),false));
test('window sensors are read-only',()=>{for(const e of READ_ONLY)assert.equal(authorize(e,'turn_on'),false)});
test('no broad services',()=>{assert.equal(authorize('light.kitchen_kitchen_main_lights','toggle'),false);assert.equal(serviceFor('light.kitchen_cabinet_lights','turn_on'),null)});
test('every readable entity has a fixed ID',()=>assert.ok(VISIBLE.every(e=>/^[a-z_]+\.[a-z0-9_]+$/.test(e))));

test('dimming limited to supported light entities',()=>{assert.equal(authorize('light.alexis_room_alexis_room_main_lights','set_brightness'),true);assert.equal(authorize('light.alexis_room_alexis_bathroom_lights','set_brightness'),false);assert.deepEqual(serviceFor('light.kitchen_kitchen_main_lights','set_brightness'),{domain:'light',service:'turn_on'})});
test('shade positioning allowed only for approved cover',()=>{assert.equal(authorize('cover.alexis_window_shade','set_position'),true);assert.equal(authorize('cover.unapproved','set_position'),false);assert.deepEqual(serviceFor('cover.alexis_window_shade','set_position'),{domain:'cover',service:'set_cover_position'})});

test('fan speed is allowed only for Alexis ceiling fan',()=>{assert.equal(authorize('fan.alexis_room_alexis_room_ceiling_fan','set_percentage'),true);assert.deepEqual(serviceFor('fan.alexis_room_alexis_room_ceiling_fan','set_percentage'),{domain:'fan',service:'set_percentage'});assert.equal(authorize('switch.alexis_room_alexis_bathroom_fan','set_percentage'),false)});

test('Oliver controls are scoped',()=>{for(const id of ['light.olivers_room_olivers_bathroom_lights','light.olivers_room_olivers_night_light'])assert.equal(authorize(id,'turn_on'),true);assert.equal(authorize('fan.olivers_room_olivers_room_ceiling_fan','set_percentage'),true);assert.equal(authorize('cover.olivers_room_shade','set_position'),true);assert.equal(authorize('cover.unapproved','set_position'),false)});
