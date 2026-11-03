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
