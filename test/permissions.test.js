import test from 'node:test';import assert from 'node:assert/strict';import {authorize,READ_ONLY,VISIBLE,serviceFor} from '../lib/permissions.js';
test('alarm modes permitted',()=>{for(const a of ['alarm_arm_home','alarm_arm_away','alarm_disarm'])assert.equal(authorize('alarm_control_panel.los_angeles_alarm',a),true)});
test('no cabinet light access',()=>assert.equal(authorize('light.kitchen_cabinet_lights','turn_on'),false));
test('window sensors are read-only',()=>{for(const e of READ_ONLY)assert.equal(authorize(e,'turn_on'),false)});
test('no broad services',()=>{assert.equal(authorize('light.kitchen_kitchen_main_lights','toggle'),false);assert.equal(serviceFor('light.kitchen_cabinet_lights','turn_on'),null)});
test('every readable entity has a fixed ID',()=>assert.ok(VISIBLE.every(e=>/^[a-z_]+\.[a-z0-9_]+$/.test(e))));
