import {readFileSync} from 'node:fs';
import {lookup} from 'node:dns/promises';
const opts=JSON.parse(readFileSync('/data/options.json','utf8'));
const secret=opts.session_secret||'';
if(secret.length<32){console.error('Family Home requires session_secret (32+ characters) in App configuration.');process.exit(1)}
process.env.SESSION_SECRET=secret;
process.env.FAMILY_HOME_ADMIN_USERNAME=opts.admin_username||'';
process.env.FAMILY_HOME_ADMIN_PASSWORD=opts.admin_password||'';
process.env.FAMILY_HOME_DB_PATH='/data/family-home.json';
process.env.HA_URL='http://supervisor/core';
process.env.HA_TOKEN=process.env.SUPERVISOR_TOKEN||'';
process.env.PORT='8099';
// Resolve the local Nginx Proxy Manager add-on; never trust arbitrary client forwarding headers.
// If the proxy is unavailable, HTTPS authentication fails closed until the app is restarted.
try {
 const addresses=await lookup('a0d7b954-nginxproxymanager',{all:true});
 // HA Supervisor's published add-on port is reached through its internal gateway.
 // Trust this fixed HA add-on ingress gateway in addition to NPM's resolved addresses.
 // This does not trust arbitrary X-Forwarded-For client addresses.
 process.env.FAMILY_HOME_TRUSTED_PROXY_IPS=[...addresses.map(a=>a.address),'172.30.32.1'].join(',');
} catch(err) {
 console.error('Trusted reverse proxy DNS unavailable; forwarded HTTPS disabled.');
 process.env.FAMILY_HOME_TRUSTED_PROXY_IPS='';
}
if(!process.env.HA_TOKEN){console.error('Supervisor token unavailable; homeassistant_api must be enabled.');process.exit(1)}
await import('./server.js');
