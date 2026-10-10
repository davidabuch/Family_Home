const groups={roomTiles:[['Main Lights','light.alexis_room_alexis_room_main_lights','💡'],['Bathroom Lights','light.alexis_room_alexis_bathroom_lights','💡'],['Bathroom Nightlight','light.alexis_room_alexis_bathroom_nightlight','🌙'],['Ceiling Fan','fan.alexis_room_alexis_room_ceiling_fan','🌀'],['Bathroom Fan','switch.alexis_room_alexis_bathroom_fan','🌀'],['Window Shade','cover.alexis_window_shade','▤']],sharedTiles:[['Kitchen Main','light.kitchen_kitchen_main_lights','💡'],['Living Room Main','light.living_room_living_room_main_lights','💡'],['Dining Room Main','light.dining_room_dining_room_main_lights_1','💡']],oliverTiles:[["Oliver's Main Lights",'light.olivers_room_olivers_room_main_lights','💡'],["Bathroom Lights",'light.olivers_room_olivers_bathroom_lights','💡'],["Night Light",'light.olivers_room_olivers_night_light','🌙'],["Ceiling Fan",'fan.olivers_room_olivers_room_ceiling_fan','🌀'],["Window Shade",'cover.olivers_room_shade','▤']]};
let csrf='',states={};const pending=new Map();let messageTimer;const $=id=>document.getElementById(id);
async function api(path,options={}){const r=await fetch('/api/'+path,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':csrf}:{}),...options.headers}});const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed');return data}
function message(s){clearTimeout(messageTimer);$('feedback').textContent=s;if(s)messageTimer=setTimeout(()=>{$('feedback').textContent=''},2500)}
function openLevel(id,name){const s=states[id];const cover=id.startsWith('cover.'),fan=id.startsWith('fan.');const value=fan?(s?.attributes?.percentage??0):cover?(s?.attributes?.current_position??0):Math.max(1,Math.round((s?.attributes?.brightness??128)*100/255));$('levelTitle').textContent=name;$('levelValue').textContent=value+'%';$('levelSlider').min=cover||fan?'0':'1';$('levelSlider').step=fan?'25':'1';$('levelSlider').max='100';$('levelSlider').value=String(value);$('levelPanel').classList.remove('hide');$('levelSlider').oninput=()=>{$('levelValue').textContent=$('levelSlider').value+'%'};$('levelApply').onclick=async()=>{await command(id,fan?'set_percentage':cover?'set_position':'set_brightness',Number($('levelSlider').value));$('levelPanel').classList.add('hide')};}
$('levelClose').onclick=()=>$('levelPanel').classList.add('hide');
function render(){for(const [root,items] of Object.entries(groups)){const el=$(root);el.replaceChildren();for(const [name,id,icon] of items){const s=states[id],v=s?.state||'unavailable',active=v==='on'||v==='open';const available=v!=='unavailable'&&v!=='unknown';const cover=id.startsWith('cover.'),fan=id.startsWith('fan.');const dimmable=id.startsWith('light.')&&s?.attributes?.supported_color_modes?.some(m=>m!=='onoff');const positional=cover&&Boolean((s?.attributes?.supported_features??0)&4);const tile=document.createElement('div');tile.className='tile'+(active?' on':'');const toggle=document.createElement('button');toggle.className='tileIcon';toggle.textContent=icon;toggle.disabled=!available;toggle.setAttribute('aria-label',(active?'Turn off ':'Turn on ')+name);toggle.onclick=()=>command(id,cover?(v==='open'?'close_cover':'open_cover'):(active?'turn_off':'turn_on'));const details=document.createElement('button');details.className='tileDetails';details.disabled=!available;const title=document.createElement('strong'),status=document.createElement('small');title.textContent=name;status.textContent=v==='on'?'On':v==='off'?'Off':v==='open'?'Open':v==='closed'?'Closed':v;details.append(title,status);if(dimmable||positional||fan){details.setAttribute('aria-label','Adjust '+name);details.onclick=()=>openLevel(id,name)}else{details.onclick=()=>toggle.click()}tile.append(toggle,details);el.append(tile)}}
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
  message('Command sent');
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
async function show(){const m=await api('me');csrf=m.csrf;$('login').classList.add('hide');$('app').classList.remove('hide');await refresh();setInterval(()=>{if(!document.hidden)refresh()},5000)}
$('loginForm').onsubmit=async e=>{e.preventDefault();try{const m=await api('login',{method:'POST',body:JSON.stringify({username:$('user').value,password:$('pass').value})});csrf=m.csrf;$('pass').value='';await show()}catch(err){alert(err.message)}};
$('logout').onclick=async()=>{await api('logout',{method:'POST'});location.reload()};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id===b.dataset.tab))});
show().catch(()=>{});

$('poolLink').href=location.protocol+'//'+location.hostname+':8101/';
