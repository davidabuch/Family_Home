let groups={roomTiles:[['Main Lights','light.alexis_room_alexis_room_main_lights','💡'],['Bathroom Lights','light.alexis_room_alexis_bathroom_lights','💡'],['Bathroom Nightlight','light.alexis_room_alexis_bathroom_nightlight','🌙'],['Ceiling Fan','fan.alexis_room_alexis_room_ceiling_fan','🌀'],['Bathroom Fan','switch.alexis_room_alexis_bathroom_fan','🌀'],['Window Shade','cover.alexis_window_shade','▤']],sharedTiles:[['Kitchen Main','light.kitchen_kitchen_main_lights','💡'],['Living Room Main','light.living_room_living_room_main_lights','💡'],['Dining Room Main','light.dining_room_dining_room_main_lights_1','💡']],oliverTiles:[["Oliver's Main Lights",'light.olivers_room_olivers_room_main_lights','💡'],["Bathroom Lights",'light.olivers_room_olivers_bathroom_lights','💡'],["Night Light",'light.olivers_room_olivers_night_light','🌙'],["Ceiling Fan",'fan.olivers_room_olivers_room_ceiling_fan','🌀'],["Window Shade",'cover.olivers_room_shade','▤']]};
let csrf='',states={};const pending=new Map();let messageTimer;const $=id=>document.getElementById(id);
async function api(path,options={}){const r=await fetch('/api/'+path,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':csrf}:{}),...options.headers}});const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed');return data}
function message(s){clearTimeout(messageTimer);$('feedback').textContent=s;if(s)messageTimer=setTimeout(()=>{$('feedback').textContent=''},2500)}
function openLevel(id,name){const s=states[id];const cover=id.startsWith('cover.'),fan=id.startsWith('fan.');const value=fan?(s?.attributes?.percentage??0):cover?(s?.attributes?.current_position??0):Math.max(1,Math.round((s?.attributes?.brightness??128)*100/255));$('levelTitle').textContent=name;$('levelValue').textContent=value+'%';$('levelSlider').min=cover||fan?'0':'1';$('levelSlider').step=fan?'25':'1';$('levelSlider').max='100';$('levelSlider').value=String(value);$('levelPanel').classList.remove('hide');$('levelSlider').oninput=()=>{$('levelValue').textContent=$('levelSlider').value+'%'};$('levelApply').onclick=async()=>{await command(id,fan?'set_percentage':cover?'set_position':'set_brightness',Number($('levelSlider').value));$('levelPanel').classList.add('hide')};}
$('levelClose').onclick=()=>$('levelPanel').classList.add('hide');
function render(){
 for(const [root,items] of Object.entries(groups)){
  const el=$(root);el.replaceChildren();
  for(const [name,id] of items){
   const state=states[id],v=state?.state||'unavailable',active=v==='on'||v==='open';
   const available=v!=='unavailable'&&v!=='unknown';
   const cover=id.startsWith('cover.'),fan=id.startsWith('fan.'),light=id.startsWith('light.');
   const dimmable=light&&state?.attributes?.supported_color_modes?.some(m=>m!=='onoff');
   const positional=cover&&Boolean((state?.attributes?.supported_features??0)&4);
   const adjustable=Boolean(dimmable||positional||fan);
   const kind=cover?'shade':(fan||id.includes('bathroom_fan'))?'fan':light?'light':'switch';
   const glyph=cover?'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M5 8h14M5 12h14M5 16h14"/>':(fan||id.includes('bathroom_fan'))?'<g class="fan-blades"><circle cx="12" cy="12" r="2.1"/><path d="M12 9.5c-3-7 5-8 6-3 .4 2-1.7 4-3.5 4.8M14.5 12c7-3 8 5 3 6-2 .4-4-1.7-4.8-3.5M12 14.5c3 7-5 8-6 3-.4-2 1.7-4 3.5-4.8M9.5 12c-7 3-8-5-3-6 2-.4 4 1.7 4.8 3.5"/></g>':light?'<path class="bulb-fill" d="M9 18h6l.4-2.3c.3-1.4 1.1-2.1 2-3.4A7 7 0 1 0 6.6 12.3c.9 1.3 1.7 2 2 3.4L9 18Z"/><path d="M9 20h6M10 22h4"/>':'<circle cx="12" cy="12" r="8"/><path d="M12 5v7"/>';
   const tile=document.createElement('div');tile.className='tile'+(active?' on':'');tile.dataset.kind=kind;
   const toggle=document.createElement('button');toggle.className='tileIcon';toggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+glyph+'</svg>';toggle.disabled=!available;
   toggle.setAttribute('aria-label',(active?'Turn off ':'Turn on ')+name);
   toggle.onclick=(event)=>{event.stopPropagation();command(id,cover?(v==='open'?'close_cover':'open_cover'):(active?'turn_off':'turn_on'))};
   const details=document.createElement('button');details.className='tileDetails';details.disabled=!available;
   const title=document.createElement('strong'),status=document.createElement('small');title.textContent=name;
   status.textContent=cover&&Number.isFinite(Number(state?.attributes?.current_position))&&state?.attributes?.current_position!=null?(position=>position===0?'Closed':position===100?'Open':position+'% Open')(Math.max(0,Math.min(100,Math.round(Number(state.attributes.current_position))))):v==='on'?'On':v==='off'?'Off':v==='open'?'Open':v==='closed'?'Closed':v;
   details.append(title,status);
   details.setAttribute('aria-label',adjustable?'Adjust '+name:(active?'Turn off ':'Turn on ')+name);
   details.onclick=(event)=>{event.stopPropagation();if(adjustable)openLevel(id,name);else toggle.click()};
   tile.onclick=()=>{if(!available)return;if(adjustable)openLevel(id,name);else toggle.click()};
   tile.append(toggle,details);el.append(tile);
  }
 }
}

async function refresh(){try{const data=await api('states');states=Object.fromEntries(data.states.map(s=>[s.entity_id,s]));for(const [id,p] of pending){if(Date.now()-p.at<3500){states[id]=p.state}else{pending.delete(id)}}$('updated').textContent=new Date().toLocaleTimeString();render()}catch(e){message('Connection error: '+e.message)}}
async function command(id,action,value){
 if(id.startsWith('alarm_control_panel.')&&!confirm('Confirm '+action.replaceAll('_',' ')+'?'))return false;
 const current=states[id];if(!current)return false;
 const alarm=id.startsWith('alarm_control_panel.');
 const previous=pending.get(id);
 const sequence=(previous?.sequence||0)+1;
 if(!alarm){
  const next={...current,attributes:{...current.attributes}};
  if(action==='turn_on'||action==='set_brightness')next.state='on';
  if(action==='turn_off')next.state='off';
  if(action==='set_brightness')next.attributes.brightness=Math.round(value*255/100);
  if(action==='set_percentage'){next.attributes.percentage=value;next.state=value?'on':'off'}
  if(action==='set_position')next.attributes.current_position=value;
  if(action==='open_cover')next.state='open';
  if(action==='close_cover')next.state='closed';
  pending.set(id,{state:next,at:Date.now(),sequence});
  states[id]=next;render();
 }
 try{
  await api('action',{method:'POST',body:JSON.stringify({entity_id:id,action,...(value===undefined?{}:{value})})});
  // Reconcile in the background: never block further taps on a slow HA read.
  refresh();
  return true;
 }catch(e){
  if(pending.get(id)?.sequence===sequence)pending.delete(id);
  message('Action failed: '+e.message);
  refresh();
  return false;
 }
}
function applyProfile(me){
 const profile=me.profile||{rooms:[]};
 const app=$('app'),nav=app.querySelector('.tabs');
 const pool=$('pool'),poolTab=nav.querySelector('[data-tab="pool"]');
 for(const el of [...app.querySelectorAll('.section')])if(el!==pool)el.remove();
 for(const el of [...nav.querySelectorAll('button')])if(el!==poolTab)el.remove();
 groups={};
 for(const [index,room] of profile.rooms.entries()){
  const id='userroom'+index,gridId=id+'Tiles';
  const tab=document.createElement('button');tab.dataset.tab=id;tab.textContent=room.name;nav.insertBefore(tab,poolTab);
  const section=document.createElement('section');section.className='section';section.id=id;
  const title=document.createElement('h2');title.textContent=room.name;
  const grid=document.createElement('div');grid.className='grid';grid.id=gridId;
  section.append(title,grid);app.insertBefore(section,pool);
  groups[gridId]=room.devices.map(d=>[d.name,d.entity_id,'']);
 }
 if(me.role!=='admin'&&me.username.toLowerCase()!=='alexis'){poolTab.classList.add('hide');pool.classList.add('hide')}
 const first=nav.querySelector('button:not(.hide)');
 if(first){first.classList.add('active');$(first.dataset.tab)?.classList.add('active')}
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));
  document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id===b.dataset.tab));
 });
 if(me.role==='admin'){
  const menu=$('profileMenu'),link=document.createElement('a');link.href='/admin.html';link.textContent='Manage Home';link.className='btn';menu.prepend(link);
 }
 const h=document.querySelector('h1');h.textContent=(me.display_name||me.username)+"'s Home";
 $('profileButton').textContent=(me.display_name||me.username).charAt(0).toUpperCase();
}
async function show(){const m=await api('me');csrf=m.csrf;applyProfile(m);$('login').classList.add('hide');$('app').classList.remove('hide');await refresh();setInterval(()=>{if(!document.hidden)refresh()},5000)}

$('loginForm').onsubmit=async e=>{e.preventDefault();try{const m=await api('login',{method:'POST',body:JSON.stringify({username:$('user').value,password:$('pass').value})});csrf=m.csrf;$('pass').value='';await show()}catch(err){alert(err.message)}};
$('logout').onclick=async()=>{await api('logout',{method:'POST'});location.reload()};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id===b.dataset.tab))});
$('profileButton').onclick=()=>{const menu=$('profileMenu');menu.classList.toggle('hide');$('profileButton').setAttribute('aria-expanded',String(!menu.classList.contains('hide')))};
show().catch(()=>{});

$('poolLink').href=location.protocol+'//'+location.hostname+':8101/';
