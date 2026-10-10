# Deployment — Alexis Pilot

The application is committed, but **not yet installed or live** in Home Assistant.

## Requirements
- Node.js 20+ running on a trusted host reachable over the home LAN/VPN
- An HA long-lived token stored **only** as a server environment variable
- A strong Alexis password, scrypt-hashed; a random session secret
- HTTPS reverse proxy for any access beyond a strictly trusted local test environment

## Setup
1. Clone this repository onto the chosen app host.
2. Create an environment file outside Git with HA_URL, HA_TOKEN, SESSION_SECRET, FAMILY_HOME_USERNAME, FAMILY_HOME_PASSWORD_HASH, and PORT (see .env.example).
3. Generate a scrypt hash using: `node -e "const c=require('node:crypto');const salt=c.randomBytes(16).toString('hex');console.log(salt+':'+c.scryptSync(process.argv[1],salt,64).toString('hex'))" 'YOUR_PASSWORD'`. Avoid shell history exposure when possible.
4. Start using `npm start` with environment variables injected by the host service manager.
5. Test login, state display, window status, and low-risk lights before enabling alarm actions for Alexis.

## Security and limitations
- Do not place the HA token, password, or alarm code in a browser, URL, GitHub or app assets.
- The server enforces a fixed per-entity/action allowlist; no arbitrary HA service calls.
- Alarm arming/disarming is explicitly allowed for Alexis, but **requires supervised physical acceptance testing** before release.
- PoolOS is deliberately not controllable yet: its authority contract must be integrated, not bypassed.
- This prototype uses in-memory sessions and a single configured user; restart logs everyone out. Before broad family rollout, add persistent multi-user identity, administrator UI, auditable actions, session revocation, and stronger operational controls.
- Never expose the Node service directly to the public internet. Prefer VPN or a trusted HTTPS access layer.
