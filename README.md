# Family Home

Private, per-user Home Assistant room and accessory controls. Family Home has independent user authentication, administrator-managed room/device permissions, and an optional Family Music link for authorized users.

## Application boundaries

- **Family Home**: lights, fans, shades, and other approved household accessories. The administrator assigns permissions by user.
- **Family Music**: separate application reached from the optional signed-in Music tab. Its own authentication remains independent.
- **Pool & Spa Family**: fully standalone application. Family Home does not link to it, issue tickets, manage its PINs, or expose Pool-specific configuration or APIs.

## Development

Run `npm test` for unit and application regression tests. CI runs Node syntax checks and the complete test suite without any Pool repository dependency.

The former Pool administrator-handoff prototype was retired in v0.1.34. `docs/POOL_HANDOFF_ACCEPTANCE.md` is a historical record only, not an active deployment guide.

## HTTPS reverse proxy

Family Home accepts direct TLS or forwarded HTTPS only when the immediate TCP peer is an explicitly trusted reverse proxy. The add-on resolves the Nginx Proxy Manager container address at startup (or uses `trusted_proxy_ips` if explicitly configured). `X-Forwarded-Proto` must be exactly `https`; an arbitrary client's forwarding header is insufficient. No shared proxy secret or custom NPM header is required. Confirm the actual peer address and HTTPS behavior during deployment; do not broaden the trusted IP list to a subnet or gateway.
