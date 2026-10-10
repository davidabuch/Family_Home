let csrf='',users=[],entities=[],profile={rooms:[]};
const $=id=>document.getElementById(id);
const status=message=>{$('status').textContent=message};
async function api(path,opts={}){
 const r=await fetch('/api/'+path,{credentials:'same-origin',...opts,headers:{'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':csrf}:{}),...opts.headers}});
 const j=await r.json();if(!r.ok)throw Error(j.error||'Request failed');return j;
}
function option(value,label){const o=document.createElement('option');o.value=value;o.textContent=label;return o}
async function loadUsers(){
 users=(await api('admin/users')).users;
 $('users').replaceChildren();$('member').replaceChildren();$('copy').replaceChildren(option('','Start empty'));
 for(const u of users){
  const line=document.createElement('div');line.className='item';
  const name=document.createElement('strong');name.textContent=u.display_name+' ('+u.username+')';
  const details=document.createElement('div');details.className='muted';details.textContent=u.role+(u.enabled===false?' · Disabled':'');
  line.append(name,details);
  if(u.role!=='admin'&&u.enabled!==false){
   const reset=document.createElement('button');reset.className='secondary';reset.textContent='Reset password';
   reset.onclick=async()=>{const password=prompt('New password (12+ characters)');if(!password)return;try{await api('admin/password',{method:'POST',body:JSON.stringify({user_id:u.id,password})});status('Password changed; existing sessions revoked')}catch(e){status(e.message)}};
   const disable=document.createElement('button');disable.className='danger';disable.textContent='Disable';
   disable.onclick=async()=>{if(!confirm('Disable '+u.display_name+' and sign out all devices?'))return;try{await api('admin/disable',{method:'POST',body:JSON.stringify({user_id:u.id})});await loadUsers()}catch(e){status(e.message)}};
   line.append(reset,disable);
  }
  $('users').append(line);
  $('member').append(option(u.id,u.display_name));
  $('copy').append(option(u.id,u.display_name));
 }
 await loadProfile();
}
async function loadProfile(){
 const id=$('member').value;if(!id)return;
 profile=(await api('admin/profile?user_id='+encodeURIComponent(id))).profile;
 drawRooms();
}
function drawRooms(){
 $('rooms').replaceChildren();
 for(const [ri,room] of profile.rooms.entries()){
  const box=document.createElement('div');box.className='item';
  const label=document.createElement('label');label.textContent='Room name';
  const input=document.createElement('input');input.value=room.name;input.maxLength=60;input.oninput=()=>room.name=input.value;
  label.append(input);box.append(label);
  const removeRoom=document.createElement('button');removeRoom.className='danger';removeRoom.textContent='Remove room';removeRoom.onclick=()=>{profile.rooms.splice(ri,1);drawRooms()};box.append(removeRoom);
  for(const [di,device] of room.devices.entries()){
   const line=document.createElement('div');line.className='item';
   const text=document.createElement('span');text.textContent=device.name+' · '+device.entity_id;
   const rename=document.createElement('input');rename.value=device.name;rename.maxLength=70;rename.setAttribute('aria-label','Accessory display name');rename.oninput=()=>device.name=rename.value;
   const del=document.createElement('button');del.className='danger';del.textContent='Remove';del.onclick=()=>{room.devices.splice(di,1);drawRooms()};
   const allowed=entities.find(e=>e.entity_id===device.entity_id)?.actions||device.actions;
   const permissions=document.createElement('div');permissions.className='muted';
   for(const action of allowed){
    const label=document.createElement('label');label.style.display='inline-flex';label.style.alignItems='center';label.style.marginRight='12px';
    const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.style.width='auto';checkbox.checked=device.actions.includes(action);
    checkbox.onchange=()=>{device.actions=checkbox.checked?[...new Set([...device.actions,action])]:device.actions.filter(a=>a!==action)};
    label.append(checkbox,document.createTextNode(' '+action.replaceAll('_',' ')));permissions.append(label);
   }
   line.append(text,rename,permissions,del);box.append(line);
  }
  const search=document.createElement('input');search.type='search';search.placeholder='Search lights, shades, fans or entity IDs';search.setAttribute('aria-label','Search Home Assistant accessories');
  const picker=document.createElement('select');picker.setAttribute('aria-label','Matching accessories');
  const assigned=new Set(profile.rooms.flatMap(r=>r.devices.map(d=>d.entity_id)));
  const matches=(e,q)=>{const terms=q.toLowerCase().trim().split(/\s+/).filter(Boolean);const hay=(e.name+' '+e.entity_id.replaceAll('_',' ')).toLowerCase();return terms.every(t=>hay.includes(t))};
  function filter(){
   const q=search.value;const available=entities.filter(e=>!assigned.has(e.entity_id)&&matches(e,q));
   picker.replaceChildren(option('','Select accessory ('+available.length+' matches)'));
   for(const e of available.slice(0,100))picker.append(option(e.entity_id,e.name+' · '+e.entity_id));
   if(!available.length)picker.options[0].textContent='No matching accessories';
  }
  search.oninput=filter;filter();
  const add=document.createElement('button');add.textContent='Add accessory';add.type='button';
  add.onclick=()=>{const e=entities.find(e=>e.entity_id===picker.value);if(!e)return;room.devices.push({entity_id:e.entity_id,name:e.name,actions:[...e.actions]});drawRooms();status(e.name+' added to '+room.name+' — click Save changes to apply')};
  box.append(search,picker,add);$('rooms').append(box);
 }
}
$('member').onchange=()=>loadProfile().catch(e=>status(e.message));
$('addRoom').onclick=()=>{const name=prompt('Room name');if(!name?.trim())return;profile.rooms.push({id:'room_'+Date.now().toString(36),name:name.trim(),devices:[]});drawRooms()};
$('save').onclick=async()=>{try{await api('admin/profile',{method:'POST',body:JSON.stringify({user_id:$('member').value,profile})});status('Room assignments saved')}catch(e){status(e.message)}};
$('create').onsubmit=async ev=>{
 ev.preventDefault();const form=new FormData(ev.currentTarget),data=Object.fromEntries(form.entries());
 if(!data.copy_from)delete data.copy_from;
 const submit=ev.currentTarget.querySelector('button[type=submit],button:not([type])');submit.disabled=true;submit.textContent='Creating…';
 try{await api('admin/users',{method:'POST',body:JSON.stringify(data)});ev.currentTarget.reset();await loadUsers();status('Family member created')}catch(e){status(e.message)}finally{submit.disabled=false;submit.textContent='Create account'}
};
(async()=>{
 try{
  const me=await api('me');csrf=me.csrf;
  if(me.role!=='admin')throw Error('Administrator access required');
  await loadUsers();
  try{entities=(await api('admin/entities')).entities}catch(e){status('Accessory catalog unavailable: '+e.message)}
 }catch(e){status(e.message)}
})();
