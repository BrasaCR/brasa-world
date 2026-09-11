# BRASA staging inventory

Verified on 2026-09-11 in Cloudflare account `badb6e9082c963c6cf48d311d067ca47`.

| Component | Staging resource | Verification |
| --- | --- | --- |
| World gateway | `brasa-content-api-staging` | Health and all three bound domain routes passed |
| Education | `brasa-education-staging` | Public seeded lesson and tenant-authorized draft creation passed |
| Identity | `brasa-identity-staging` | Education-only introspection passed; broader GovID routes return 404 |
| Business | `brasa-business-staging` | Health and opportunity discovery passed |
| Government | `brasa-government-staging` | Health and civic-service discovery passed; restricted metadata returned 404 |
| Education database | `brasa-education-staging` / `0ebb424e-50d8-48a4-9964-1cfec6d60994` | Additive school migration applied; non-personal smoke fixture seeded |
| Identity database | `brasa-identity-staging` / `df39f4ff-b3e8-4dcc-acbd-932995200322` | Hashed, expiring, revocable service-session schema only |

Staging URLs use the account's `richard-bad.workers.dev` development subdomain. No production Worker, route, custom domain, Pages project, or production database was changed. A one-time random Education session produced a tenant-bound draft and audit event, was immediately revoked, and returned 401 on reuse.
