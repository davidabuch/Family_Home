# Family Home remote access commissioning baseline — 2026-10-13

Status: **PASS (user-confirmed end-to-end on cellular)**. Family Home add-on version: **v0.1.35**.

## Tested access paths

- Local/VPN: `https://home-local.davidbuchmd.com` — Family Home admin login successful.
- Remote cellular with Wi-Fi and VPN disabled: `https://home.davidbuchmd.com` — Cloudflare Access challenge, successful Cloudflare authentication, independent Family Home sign-in, and dashboard access all **PASS**.

## Known-good remote topology

```text
Browser HTTPS
  -> Cloudflare Access (self-hosted app: home; restricted Allow policy)
  -> Cloudflare Tunnel (Buch-Home-Services)
       published hostname: home.davidbuchmd.com
       service: HTTPS 192.168.1.125:443
       HTTP Host Header: home.davidbuchmd.com
       TLS Origin Server Name: home.davidbuchmd.com
       No TLS Verify: OFF
       Access JWT validation: ON (app: home)
  -> Nginx Proxy Manager HTTPS/443
       proxy host: home.davidbuchmd.com
       selected SSL certificate: home.davidbuchmd.com
       Force SSL: ON; HTTP/2: ON
       Trust Upstream Forwarded Proto Headers: OFF
       forward scheme: HTTP
       forward hostname: 9a6cd3cf-family-home
       forward port: 8099
  -> Family Home add-on internal HTTP/8099
       trusted NPM peer + X-Forwarded-Proto=https
```

Local/VPN NPM host `home-local.davidbuchmd.com` also forwards directly to the Family Home add-on hostname/8099 and was confirmed working. Add-on host-published port `8102` is **not** the remote tunnel origin.

## Security invariants

1. Preserve Cloudflare Access application policy and **Access JWT validation ON** for the remote route.
2. Preserve TLS certificate verification: **No TLS Verify OFF**; specify Origin Server Name for certificate hostname/SNI.
3. Keep NPM Force SSL ON; do not disable HTTPS enforcement to suppress redirects.
4. Family Home must accept forwarded HTTPS **only** from the explicitly trusted NPM container peer with `X-Forwarded-Proto` exactly `https`. Do not trust the Docker gateway, entire subnet, or untrusted client headers.
5. Family Home's own login remains required after Cloudflare Access; do not combine identities or bypass it.
6. Do not alter Family Music or Pool & Spa Family as part of Family Home remote routing.
7. Do not commit passwords, session secrets, tunnel tokens, or user access PINs.

## Failures observed and lessons

- Tunnel directly to `http://192.168.1.125:8102`: Cloudflare Access authentication succeeded but Family Home login returned **"HTTPS required for Family Home sign-in"**. This bypassed NPM; forwarded HTTPS headers alone did not establish a trusted immediate peer.
- Tunnel to `http://192.168.1.125:80` with the correct HTTP Host Header: browser returned **too many redirects**. NPM's Force SSL was ON; HTTP-to-HTTPS origin redirect loop was the consistent diagnosis.
- Tunnel to `https://192.168.1.125:443`, with HTTP Host Header and TLS Origin Server Name set to `home.davidbuchmd.com`, TLS verification enabled: **end-to-end remote login PASS**.

## Regression/commissioning checklist

- [ ] Confirm Family Home add-on is running and health endpoint returns HTTP 200.
- [ ] Confirm local/VPN `home-local.davidbuchmd.com` login works.
- [ ] On cellular with Wi-Fi and VPN disabled, use a fresh private session to open `https://home.davidbuchmd.com`.
- [ ] Confirm Cloudflare Access challenge appears and allowed account authenticates.
- [ ] Confirm Family Home's **separate** sign-in succeeds and dashboard loads.
- [ ] Confirm a non-allowed Cloudflare identity cannot pass Access (not tested during initial commissioning).
- [ ] Confirm redirect loop and "HTTPS required" errors do not recur.
- [ ] Inspect NPM forwarding, tunnel TLS origin settings, and trusted peer diagnostics before changing authentication code if regression occurs.

## Scope and verification limits

This is a configuration and human acceptance record, **not** an automated penetration test or assertion that all edge cases are covered. The successful end-to-end cellular login was confirmed by the operator on 2026-10-13. Avoid modifying the known-good routing merely to simplify it.
