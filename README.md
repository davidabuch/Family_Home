# Family_Home
Granular Access to our home

## Pool & Spa administrator handoff

PR #10's Pool link now uses a CSRF-protected `POST /api/pool-admin-handoff` for the current enabled administrator. The ticket is returned only in a no-store JSON body and passed to the fixed Pool handoff popup using exact-origin and source-window checks. The old GET redirect with a ticket query string is rejected. Ordinary family users use the same Pool link without administrator elevation.

Configure the existing app's new `proxy_secret`, `public_origin`, `pool_local_origin`, and `pool_handoff_secret` options before a future authorized install. Forwarded HTTPS now requires both the exact trusted proxy peer and the secret; published-port callers cannot spoof HTTPS. Match the handoff secret to Pool `family_admin_handoff_secret` and Home origin to Pool `family_home_origin`. Remote origins default off and cannot route into the local boundary. Remote administrator issuance also requires explicit account `remote_access`.

See [the Pool candidate proxy guide](https://github.com/davidabuch/Home-assistant-intellicenter/blob/feature/pool-family-home-handoff-20261012/standalone/docs/NPM_POOL_FAMILY_CONFIGURATION.md) for the reviewed topology and complete local NPM locations. NPM's host-list API denied this engineering session with 403, so existing generated rules and tunnel routes still require manual verification. No runtime configuration was changed.

Run `npm test` for all unit, browser-message and real HTTP endpoint tests. With `POOL_SOURCE` set to a Pool checkout and `PYTHON_BINARY` using its authentication dependencies, tests additionally exchange a real Home HTTP-issued ticket with the Pool request handler, check all three Pool operations, replay and session expiry, and mock every equipment call. Tests never contact live Home Assistant.
