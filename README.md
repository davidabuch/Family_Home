# Family Home

Private, per-user Home Assistant room and accessory controls. Family Home has independent user authentication, administrator-managed room/device permissions, and an optional Family Music link for authorized users.

## Application boundaries

- **Family Home**: lights, fans, shades, and other approved household accessories. The administrator assigns permissions by user.
- **Family Music**: separate application reached from the optional signed-in Music tab. Its own authentication remains independent.
- **Pool & Spa Family**: fully standalone application. Family Home does not link to it, issue tickets, manage its PINs, or expose Pool-specific configuration or APIs.

## Development

Run `npm test` for unit and application regression tests. CI runs Node syntax checks and the complete test suite without any Pool repository dependency.

The former Pool administrator-handoff prototype was retired in v0.1.34. `docs/POOL_HANDOFF_ACCEPTANCE.md` is a historical record only, not an active deployment guide.
