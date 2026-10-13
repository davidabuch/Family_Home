import {createHmac, randomBytes} from 'node:crypto';

export function poolDestination(origin, config) {
 const local = config.homeOrigin || 'https://home-local.davidbuchmd.com';
 const destination = origin === local ? (config.poolOrigin || 'https://pool-local.davidbuchmd.com')
  : config.remoteHomeOrigin && origin === config.remoteHomeOrigin ? config.remotePoolOrigin : null;
 if (!destination) return null;
 try {
  const home = new URL(origin);
  if (home.origin !== origin || home.protocol !== 'https:' || home.username || home.password) return null;
 } catch { return null; }
 try {
  const url = new URL(destination);
  if (url.origin !== destination || url.protocol !== 'https:' || url.username || url.password
      || !['pool-local.davidbuchmd.com', 'pool.davidbuchmd.com'].includes(url.hostname)) return null;
  // A remote Home route can never fall back into the local trust boundary.
  if (origin === local && url.hostname !== 'pool-local.davidbuchmd.com') return null;
  if (origin !== local && url.hostname !== 'pool.davidbuchmd.com') return null;
  return destination;
 } catch { return null; }
}

export function issuePoolTicket(session, secret, now = Date.now()) {
 if (!session || session.user.role !== 'admin' || session.user.enabled === false
     || !Number.isFinite(session.expires) || session.expires <= now
     || typeof session.user.id !== 'string' || !session.user.id || (session.user.expires_at && Date.parse(session.user.expires_at) <= now)
     || typeof secret !== 'string' || secret.length < 32) throw Error('Administrator handoff unavailable');
 const claims = {aud: 'pool-spa-family', sub: session.user.id, role: 'admin',
  exp: Math.floor(now / 1000) + 60, nonce: randomBytes(24).toString('hex'), sid: session.id};
 const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
 return payload + '.' + createHmac('sha256', secret).update(payload).digest('base64url');
}
