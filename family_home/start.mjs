import {readFileSync} from 'node:fs';
import {scryptSync,randomBytes} from 'node:crypto';
const opts=JSON.parse(readFileSync('/data/options.json','utf8'));
const password=opts.password||'',secret=opts.session_secret||'';
if(password.length<10||secret.length<32){console.error('Family Home requires password (10+ characters) and session_secret (32+ characters) in App configuration.');process.exit(1)}
const salt=randomBytes(16).toString('hex');
process.env.FAMILY_HOME_USERNAME=opts.username||'alexis';
process.env.FAMILY_HOME_PASSWORD_HASH=salt+':'+scryptSync(password,salt,64).toString('hex');
process.env.SESSION_SECRET=secret;
process.env.HA_URL='http://supervisor/core';
process.env.HA_TOKEN=process.env.SUPERVISOR_TOKEN||'';
process.env.PORT='8099';
if(!process.env.HA_TOKEN){console.error('Supervisor token unavailable; homeassistant_api must be enabled.');process.exit(1)}
await import('./server.js');
