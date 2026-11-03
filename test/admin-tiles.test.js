import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/admin.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../public/admin.js',import.meta.url),'utf8');
test('admin provides compact three-column shortcuts to room settings',()=>{
 assert.match(html,/id="memberTiles"/);
 assert.match(html,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(html,/id="roomSettings"/);
});
test('shortcuts are derived from member accounts and use stable IDs',()=>{
 assert.match(js,/users\.filter\(u=>u\.role!=='admin'\)/);
 assert.match(js,/tile\.textContent|name\.textContent=u\.display_name/);
 assert.match(js,/\$\('member'\)\.value=u\.id/);
 assert.match(js,/await loadProfile\(\)/);
 assert.match(js,/scrollIntoView/);
 assert.match(js,/renderMemberTiles\(\)/);
});

const home=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
test('administrator landing displays three compact member tiles per row',()=>{
 assert.match(home,/id="adminHome"/);
 assert.match(home,/id="adminHomeGrid"/);
 assert.match(home,/\.adminHomeGrid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});
test('only administrator receives dynamic member settings shortcuts',()=>{
 assert.match(app,/if\(m\.role==='admin'\)\{try\{await renderAdminHome\(\)/);
 assert.match(app,/api\('admin\/users'\)/);
 assert.match(app,/filter\(u=>u\.role!=='admin'\)/);
 assert.match(app,/encodeURIComponent\(member\.id\)/);
 assert.match(js,/new URLSearchParams\(location\.search\)\.get\('member'\)/);
});
