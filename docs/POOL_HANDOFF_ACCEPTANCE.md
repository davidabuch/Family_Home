# Pool handoff acceptance record — development candidate

Governing workflow: GitHub + Home Assistant Autonomous Engineering Workflow v3.2. Existing Family Home PR #10 branch is retained. IntelliCenter baseline is main's PR #77 merge (`c74b8d7`), including authentication implementation `e69efd0`. Family Home starting head was `bf9d9f5`.

Authorization: implement, test with mocks, commit, create/update PRs and continuously poll/fix CI. Merge, deploy/update add-ons, restart Home Assistant and operate equipment are **not authorized**. No equipment/manual suppression state was altered or inferred.

| Behavior | Evidence and expected result | Candidate evidence level |
| --- | --- | --- |
| PIN-free Pool UI | Existing tile layout retained; no PIN input or login API dependency | CODE TESTED |
| Family local boundary | Exact NPM peer plus secret required; forged forwarding/direct-port headers denied | CODE TESTED |
| Remote family boundary | Pool verifies RS256 JWT signature, issuer, audience, time claims and allowed email | CODE TESTED |
| Pool administrator privilege | Real Home HTTP issuance → real Pool handler exchange → all Pool operations through mocked HA gateway | CODE TESTED |
| Family controls | Existing Spa/features entity/service payloads retained; no Pool role elevation | CODE TESTED |
| Issuer authorization | Member, disabled/expired account, expired session, remote-ineligible admin denied | CODE TESTED |
| CSRF | Issuer requires configured same origin, JSON and per-session token; receiver POST requires exact Pool origin | CODE TESTED |
| Ticket exposure | Both browser scripts use JSON and exact-origin/source-window messages; no ticket navigation/storage/logging | CODE TESTED |
| Ticket expiry/replay | Expired/tampered/wrong role/audience, concurrent replay and restart replay rejected | CODE TESTED |
| Pool session expiry | Permissions and command guard deny after 15 minutes | CODE TESTED |
| Local/remote separation | Missing remote config cannot select local destination/origin | CODE TESTED |
| Equipment gateway | Every equipment call mocked; no real HA/equipment command used | CODE TESTED |
| Live proxy inventory | Supervisor metadata inspected; NPM 172.30.33.4, Home 172.30.33.3, Cloudflared 172.30.33.5 | HA OBSERVED (metadata only) |
| NPM actual host/access rules | Read-only host API returned 403; do not presume safe | BLOCKED (manual authenticated review) |
| Deployment and browser/network commissioning | Prohibited by current task; existing Home 0.1.32 and Pool 0.1.6 untouched | NOT RUN |
| Physical commissioning | No authorization; not required for this code/CI task | NOT RUN |

Current-head GitHub CI is tracked in the paired PRs; only successful runs for those exact heads constitute `CI GREEN`. Cross-application checks pin counterpart source commits in CI. A later workflow-only pin update leaves that counterpart runtime source identical. This record does not claim runtime or physical acceptance of the candidate.

The exact proxy configuration and prerequisites are in the paired IntelliCenter `standalone/docs/NPM_POOL_FAMILY_CONFIGURATION.md`. Before any separately authorized installation, manually verify current NPM host entries/generated rules, source-preserving household VLAN boundary, DNS/certificates, tunnel routes, private proxy secrets, shared ticket secret and matching exact origins. Remote remains disabled until its separate Access configuration and Home-wide policy are reviewed. Home logout prevents new tickets; already-issued Pool sessions remain bounded to 15 minutes.

Next executable action in this phase: finish local gates, push both branches, create/update draft PRs, poll each exact SHA, inspect failures and fix forward until all required CI is green. Then report prerequisites without merging or deploying.
