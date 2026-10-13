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
process.env.FAMILY_HOME_PROXY_SECRET=opts.proxy_secret||'';
process.env.FAMILY_HOME_PUBLIC_ORIGIN=opts.public_origin||'https://home-local.davidbuchmd.com';
process.env.FAMILY_HOME_REMOTE_ORIGIN=opts.remote_origin||'';
// Prefer NPM's container-to-container route. Never implicitly trust a shared NAT gateway.
try {
 const addresses=await lookup('a0d7b954-nginxproxymanager',{all:true});
 process.env.FAMILY_HOME_TRUSTED_PROXY_IPS=opts.trusted_proxy_ips||addresses.map(a=>a.address).join(',');
} catch {
 process.env.FAMILY_HOME_TRUSTED_PROXY_IPS=opts.trusted_proxy_ips||'';
 console.error('Trusted reverse proxy DNS unavailable; explicit proxy IPs required.');
}
if(!process.env.HA_TOKEN){console.error('Supervisor token unavailable; homeassistant_api must be enabled.');process.exit(1)}
await import('./server.js');
