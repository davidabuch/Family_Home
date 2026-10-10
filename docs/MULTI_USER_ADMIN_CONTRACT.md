# Family Home — Multi-user administration implementation contract

Status: **in development on feature/multi-user-admin; not deployed**.

## Product
One Home Assistant App, one URL, one visual design. Every family member has a separate account and sees only their assigned rooms/accessories. The admin can create users, copy a room layout from an existing user, add/remove Home Assistant entities, rename tiles, assign rooms, grant view-only/control rights, disable accounts, and revoke device sessions without code edits.

## Non-negotiable security
- Never expose HA API credentials, alarm entities, locks, cameras, secrets, or broad HA entity lists to ordinary users.
- All reads and actions must be authorized **on the server per authenticated user**. A hidden tile is not a permission boundary.
- Entity picker is admin-only and excludes high-risk domains by default; adding a new supported domain requires engineering review.
- Accessory actions are constrained to safe services for that domain, then intersected with the user's assigned permissions and actual HA capabilities.
- Admin role alone does not grant control of unassigned devices.
- Use unique salted password hashes, session rotation, rate-limited login, CSRF protection, and revocable per-device sessions. Never place HA tokens or passwords in browser storage.
- Long-lived sessions must be enabled **only over HTTPS**. The current plain HTTP LAN URL is insufficient for persistent authentication.
- Sensitive user/session data must be stored in the app's persistent data volume (e.g. /data), never committed to the public GitHub repo. Save atomically and back up before migration.
- Account disabling and password changes revoke existing sessions.
- Guest accounts support expiry.
- Do not add Security/alarm functionality back into Family Home.
- PoolOS and HLM remain the sole ownership authorities for their respective systems. Do not bypass them with new direct controls.

## Migration / rollout
1. Build and test profile model and deny-by-default action policy (initial code in lib/profiles.js).
2. Add persistent database and one-time migration of Alexis's current layout and credentials. Verify no data loss and rollback ability.
3. Add administrator bootstrap and separate admin login, plus per-user authentication and session revocation.
4. Make /api/states and /api/action use authenticated profile permissions, with comprehensive negative tests.
5. Add admin-only user CRUD, HA entity discovery, and room/device assignment APIs.
6. Add admin UI and dynamic personalized UI. Keep compact tiles, light-blue background, spinning fan icons, and shade percentage labels.
7. Add HTTPS ingress/endpoint strategy; test iOS Add to Home Screen and persistent sessions.
8. Run regression and security tests, deploy only after explicit review of migration, then verify Alexis before adding another account.

## Rollback
Keep the existing stable release running during branch development. No direct changes to live HA device states are required. Do not enable automatic upgrade to an untested schema migration.

## Network access policy (October 2026 decision)
- Local-first rollout. Do not deploy Cloudflare Tunnel or enable public ingress during initial multi-user commissioning.
- Account role, entity permission, and remote-access eligibility are separate dimensions. Remote eligibility defaults to false, including administrators; explicitly opt in the owner's account only after remote security review.
- Guests must never be eligible for remote access. Family members default to local-only; VPN use is governed by network/VPN credentials, not merely the application role.
- Future remote entry must be separately authenticated and server-enforced, with a trustworthy origin signal from a locked-down ingress. Never trust client-supplied forwarded headers or browser UI to assert remote/local status.
- Remote access must not expand assigned entity actions. Owner-only remote music and Pool/Spa features require separate reviewed integrations respecting existing PoolOS authority and safe command boundaries.
- Avoid conflating VPN clients with local clients; any policy distinguishing them requires verifiable network identity, not source-IP guesses.
- Release gate: negative tests for guest remote denial, default-off remote eligibility, direct-origin bypass, spoofed headers, and revocation before any public ingress.
