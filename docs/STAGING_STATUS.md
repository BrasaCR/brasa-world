# BRASA staging inventory

Verified on 2026-09-11 in Cloudflare account `badb6e9082c963c6cf48d311d067ca47`.

| Component | Staging resource | Verification |
| --- | --- | --- |
| World gateway | `brasa-content-api-staging` | Health and all three bound domain routes passed |
| Education | `brasa-education-staging` (`e6ce81ce-0635-454a-b06f-625938f6fb43`) | Public lesson, administrator UI, session proxy, tenant-authorized drafts, membership management, and lesson review passed |
| Identity | `brasa-identity-staging` (`d65917c8-5ae7-44ae-aa11-44a389282199`) | One-time invitation exchange, rotation, logout, and Education-only introspection passed; broader GovID routes return 404 |
| Business | `brasa-business-staging` | Health and opportunity discovery passed |
| Government | `brasa-government-staging` | Health and civic-service discovery passed; restricted metadata returned 404 |
| Education database | `brasa-education-staging` / `0ebb424e-50d8-48a4-9964-1cfec6d60994` | Additive school migration applied; non-personal smoke fixture seeded |
| Identity database | `brasa-identity-staging` / `df39f4ff-b3e8-4dcc-acbd-932995200322` | Hashed one-time invitations plus rotating, expiring, revocable Education sessions |

Staging URLs use the account's `richard-bad.workers.dev` development subdomain. No production Worker, route, custom domain, Pages project, or production database was changed. A dynamically generated invitation was exchanged for a session, renewed once, and used to create a tenant-bound draft and audit event. The rotated token returned 401, logout revoked its replacement, and the invitation returned 401 on reuse. No raw invitation or bearer token was printed or persisted.

The school console now separates administrator-only membership management from administrator/reviewer lesson-status decisions. Live checks confirmed the updated console and health endpoint return 200 while unauthenticated management returns 401. Invitation creation remains intentionally behind the trusted Identity operator boundary rather than being exposed through a public Education route.
