# Family Home stale-asset diagnosis — 2026-10-13

Baseline: main `7b9b81f1772639bcf296d4e10fe01ba4e438c6cf`; running add-on reports v0.1.35.

## Observed evidence

- Two fresh direct HA app-proxy requests to internal port 8099 returned old `app.js`, including `const pool=$('pool')` and the obsolete `poolLink` URL ending in `:8101/`. The second used a unique query plus request `Cache-Control: no-cache` / `Pragma: no-cache`.
- After normalization of the final newline, that served file exactly matches the `public/app.js` in commit `db86176ffa5e135444c3d9f30acfa53a82e21f7d` (PR #9), before Pool removal. The current main asset has neither Pool UI reference and retains `Open Family Music`.
- This contradicts the initial report that the direct running asset was Pool-free. Serving Music does not establish absence of the older Pool block: this older revision has both.
- Supervisor logs record the v0.1.35 build at 12:17:24–12:17:25 on the HA host clock. Its actual `docker buildx build` command passes `--build-arg BUILD_VERSION=0.1.35` and labels the resulting image v0.1.35.
- The Dockerfile declares only the unchanged `FAMILY_HOME_BUILD_REV=20261012-music-permissions` around its network `git clone` RUN. It never declares/uses `BUILD_VERSION`. The local startup script is copied separately after cloning. A cached source-fetch layer can therefore remain old while startup configuration and image version are updated.
- No service worker registration or Cache Storage references occur in current Family Home source. The existing static-asset server sends `Cache-Control: no-store`.

The deployed image contains stale application assets. Reuse of the version-independent source-fetch layer is the build defect consistent with the exact old source and very short build; the Docker regression test reproduces that failure before validating the correction. This is not evidence for changing browser, Cloudflare or NPM cache policies.

## Route investigation limits

The repository's independently commissioned topology is documented in `REMOTE_ACCESS_COMMISSIONING_2026-10-13.md`: both local and remote NPM hosts target `9a6cd3cf-family-home:8099`; the remote tunnel verifies HTTPS/SNI at `192.168.1.125:443` and Access JWT validation remains enabled.

The execution host cannot resolve `home-local.davidbuchmd.com` or reach the HA host-published 8102 port. An unauthenticated remote HTTPS probe returned Cloudflare HTTP 403 with private/no-store headers; that response is not the application JavaScript and does not prove its cache status. NPM's authenticated host-list API also returned 403. The HA app proxy supports HTTP transport only: sending HTTP to NPM's TLS port correctly returned 400, so it cannot validate these HTTPS paths. None of these protections was bypassed or disabled.

Thus the direct add-on asset is observed independently, while the remote old-asset observation is supplied by the operator. Actual local/remote response equality and administrator login must be verified through authorized authenticated HTTPS sessions after the corrected build. Do not claim those paths passed merely because the add-on version or repository source is current.

## Minimal correction and deployment

Declare `ARG BUILD_VERSION` before the source-fetch RUN, require it to be nonempty, and reference it in that RUN. Supervisor already supplies this argument; each release now invalidates the source-fetch layer. Keep the optional existing build-revision override, base image, packaging paths, authentication, permissions, endpoints and frontend assets unchanged. Release v0.1.36 makes one targeted corrected build available.

`scripts/test_build_cache.py` replaces only git-clone network transport with a mutable loopback archive. It uses actual Docker ARG/cache behavior, actual production packaging instructions and real image reads. The baseline reconstructs stale assets across version changes; the corrected recipe must package byte-identical current Pool-free/Music-preserving assets. No application server or equipment command starts in this build test. The existing 38 unit/regression tests cover authentication, trusted proxies, permissions, music visibility and complete Pool decoupling.

After green CI and merge, back up the Family Home add-on and perform one Family Home update. No Home Assistant Core restart, Pool & Spa app change or reverse-proxy/tunnel change is required. Verify served file hashes and absent Pool/present Music markers rather than trusting the displayed add-on version. Preserve the known-good Access policy, origin certificate verification, NPM HTTPS settings, private options and persistent user database.
