import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
test('sculptural backdrop is packaged and served as SVG',async()=>{
 const [server,html,scene]=await Promise.all(['server.js','public/index.html','public/sculptural-white.svg'].map(p=>readFile(new URL(p,root),'utf8')));
 assert.match(server,/['\"]\/sculptural-white\.svg['\"]/);
 assert.match(server,/image\/svg\+xml/);
 assert.match(html,/url\(['\"]\/sculptural-white\.svg['\"]\)/);
 assert.match(scene,/<svg\b/);
 assert.match(scene,/<\/svg>/);
});
test('visual-only design retains existing accessory and session wiring',async()=>{
 const [html,app]=await Promise.all(['public/index.html','public/app.js'].map(p=>readFile(new URL(p,root),'utf8')));
 for(const id of ['loginForm','roomTiles','sharedTiles','oliverTiles','levelPanel','levelSlider'])assert.ok(html.includes('id="'+id+'"'),id);
 for(const tab of ['room','shared','oliver'])assert.ok(html.includes('data-tab="'+tab+'"'),tab);
 assert.match(app,/api\('action'/);
 assert.match(app,/permissions\[id\]/);
});
