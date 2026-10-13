// Tickets exist only in memory and in POST/message bodies; never in navigation.
window.openPoolAdministrator = function(destination, api, onError) {
 const child = window.open(destination + '/admin-handoff.html', '_blank');
 if (!child) { onError('Allow a new window to authorize Pool controls.'); return; }
 let sending = false;
 const cleanup = () => { clearTimeout(timer); window.removeEventListener('message', receive); };
 const timer = setTimeout(() => { cleanup(); onError('Pool authorization timed out. Open Pool & Spa again.'); }, 60000);
 async function receive(event) {
  if (event.origin !== destination || event.source !== child) return;
  if (event.data?.type === 'pool-admin-complete') { cleanup(); return; }
  if (event.data?.type !== 'pool-admin-ready' || sending) return;
  sending = true;
  try {
   const result = await api('pool-admin-handoff', {method: 'POST', body: '{}'});
   if (result.pool_origin !== destination || typeof result.ticket !== 'string') throw Error('Pool destination mismatch');
   child.postMessage({type: 'pool-admin-ticket', ticket: result.ticket}, destination);
  } catch {
   cleanup(); onError('Pool administrator authorization failed. Sign in to Family Home and try again.');
  }
 }
 window.addEventListener('message', receive);
};
