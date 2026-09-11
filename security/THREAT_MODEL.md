# BRASA Shield threat model v0.1

## Protected boundaries

- A compromised public page or widget must not reach GovID, secrets, databases, deployment credentials, other tenants, or recovery systems.
- Education authenticates through GovID but authorizes through its own active school membership. Every tenant-bearing query and write must bind the route tenant, database tenant, and audit tenant to the same identifier.
- Business and Government discovery are anonymous public-data services. They must never accept learner history, GovID, political preference, eligibility decisions, or cross-product behavioral profiles.
- The central API has service bindings with public-read scope only. Administrative and identity services are not bound to it.

## Primary threats and controls

| Threat | Current control | Required before production |
| --- | --- | --- |
| Cross-tenant access | Same-school membership query; public response minimization; two-school tests | Preview D1 test with two real tenants and denied cross-tenant reads/writes |
| API abuse and scraping | Bounded query count/URL length/result limits; cacheable public reads | Cloudflare WAF rate-limit rules by route; bot policy; load thresholds |
| Injection and malicious links | Parameter validation, prepared D1 statements, DOM `textContent`, protocol allowlists | Content Security Policy validation in preview |
| Credential/session compromise | No credentials accepted by public widgets/gateways; private routes excluded from caches | Token revocation drill and administrator step-up policy |
| Supply-chain compromise | Minimal dependency-free runtime and isolated branches | Protected branches, signed releases, dependency/secret scanning in CI |
| Destructive deployment | Independent services and additive migrations | Preview/canary deployment, health gates, recorded rollback owner |
| Data loss or corruption | Additive schema and append-only audit log | D1 backup/restore exercise with measured recovery objectives |
| Telemetry privacy leak | Route templates and request IDs only; no query/IP/GovID event fields | Log-retention policy and sampled review |

## Explicitly prohibited automation

Shield v0.1 cannot alter cryptography, delete database records, broaden tenant access, rotate master recovery credentials, modify backups, or deploy production changes autonomously. Those actions require a documented human-approved procedure.
