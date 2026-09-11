# BRASA staging inventory

Verified on 2026-09-11 in Cloudflare account `badb6e9082c963c6cf48d311d067ca47`.

| Component | Staging resource | Verification |
| --- | --- | --- |
| World gateway | `brasa-content-api-staging` | Health and all three bound domain routes passed |
| Education | `brasa-education-staging` (`a22e6cae-0347-46e1-b7c6-b89aa4ea5a7e`) | School lifecycle controls, onboarding, administrator settings, tenant administration, and lesson workflow passed |
| Identity | `brasa-identity-staging` (`989af24d-e73d-4bc2-8e82-9c62f34b9ec8`) | Emergency actor-session revocation plus protected invitation and session lifecycle passed; broader GovID routes return 404 |
| Business | `brasa-business-staging` | Health and opportunity discovery passed |
| Government | `brasa-government-staging` | Health and civic-service discovery passed; restricted metadata returned 404 |
| Education database | `brasa-education-staging` / `0ebb424e-50d8-48a4-9964-1cfec6d60994` | Additive school migration applied; non-personal smoke fixture seeded |
| Identity database | `brasa-identity-staging` / `df39f4ff-b3e8-4dcc-acbd-932995200322` | Hashed one-time invitations plus rotating, expiring, revocable Education sessions |

Staging URLs use the account's `richard-bad.workers.dev` development subdomain. No production Worker, route, custom domain, Pages project, or production database was changed. A dynamically generated invitation was exchanged for a session, renewed once, and used to create a tenant-bound draft and audit event. The rotated token returned 401, logout revoked its replacement, and the invitation returned 401 on reuse. No raw invitation or bearer token was printed or persisted.

The school console separates administrator-only membership management from administrator/reviewer lesson-status decisions. Live checks confirmed the updated console and health endpoint return 200 while unauthenticated management returns 401. Invitation creation crosses the service binding with a shared staging secret after Education verifies the school administrator; direct calls to Identity without that credential fail closed.

The binding-authenticated invitation flow passed end to end with dynamically generated administrator and teacher identities: bootstrap exchange 201, administrator invitation issuance 201, teacher exchange 201, administrator management 200, and teacher management denial 403. Both sessions and temporary memberships were revoked afterward, no raw secrets were printed or persisted, and the obsolete fixed teacher membership was removed from both the staging seed and remote staging database.

School onboarding now uses a separate staging-only platform-operator secret. Migration `0003_school_settings.sql` added supported locales and bounded branding settings. A temporary school onboarding returned 201, its first administrator exchange returned 201, authorized school management returned 200, and an unauthenticated onboarding request returned 401. The temporary tenant, membership, audit data, and administrator session were removed or revoked after verification; no raw operator credential or invitation was printed or persisted locally.

School-owned settings passed live verification with a temporary administrator: session exchange 201, settings read 200, bounded update 200, unsafe support URL rejection 400, and restoration 200. The session and temporary membership were revoked afterward. School suspension, status changes, and ownership recovery remain excluded from administrator settings.

Platform lifecycle controls passed against a temporary tenant: suspension 200, immediate rejection of the old administrator session 401, reactivation 200, ownership recovery 200, replacement invitation exchange 201, and replacement administrator access 200. Migration `0004_school_suspension.sql` preserves pre-suspension membership state. Temporary tenant data and sessions were removed or revoked afterward, and no raw credentials were printed or persisted locally.
