# BRASA preproduction evidence register

Prepared before pilot selection so production decisions are visible and cannot be silently inferred.

## Verified staging baseline

- World gateway: `a350aab5-0b3d-4b03-950b-1fb31ec8e80d`
- Education: `2d5f9d73-758c-493d-acb5-3f921f248aaa`
- Identity: `0364fb13-df64-483f-9e13-d115bece6f51`
- Business: `a67ae38d-73b0-4ed0-a74c-d9b574ad468c`
- Government: `e4b7dab4-f1b0-4393-9bc5-f2dc71dfec95`
- Government administrator: `Richard` / `BRA-ADMIN-RICHARD01`

These identifiers establish the staging evidence baseline only. They are not production approvals.

## System-prepared controls

- Separate staging Workers and databases.
- Service bindings preserve Education, Business, and Government ownership.
- API consumers use hashed credentials, narrow scopes, quotas, rotation, and revocation.
- School authorization binds identity, tenant membership, route tenant, and audit tenant.
- Operator sessions are short-lived, revocable, and excluded from browser persistence.
- Public widgets omit credentials and render remote values as text.
- Private and authenticated routes are excluded from offline caches.
- Additive migrations, rollback instructions, threat model, incident response, and recovery checklist exist.
- The public trust endpoint refuses the “Protected by BRASA” claim.
- The named production Wrangler environment and production service names are defined without a database identifier, route, or deployment authorization; the release gate therefore remains closed.
- `Richard` is recorded as release owner, but no release timestamp or operational approval is inferred.

## Human or external gates still open

The machine-readable production gate remains authoritative. Infrastructure approval requires a timestamp, production D1 identifier, approved and rollback versions, custom-domain approval, verified production bindings and alerts, and approved retention periods. Pilot activation is a separate later gate requiring a first consumer with scopes, quota, owner, and rollback contact. Cloudflare WAF, phishing-resistant access, restore testing, tenant-isolation evidence, and legal review must be evidenced outside source code.

No production Worker, route, DNS record, database, consumer, or public protection claim may be created merely because this register exists.

## Production canary evidence

The approved isolated production resources were provisioned on 2026-09-11 without reusing staging or changing the existing BRASA site Workers:

- API database `brasa-api-production`: `ff518620-621d-4c52-aac7-7cbf76790be2`
- Education database `brasa-education-platform-production`: `fdcc01ce-6b7e-405b-8bc0-6c35ff673e9c`
- Business database `brasa-business-marketplace-production`: `61e0e794-30d2-4e52-a891-b9a1b46d3320`
- Government database `brasa-government-reviews-production`: `ce6032f6-25a2-40a9-8d7a-090997cc6d3a`
- Education Worker `brasa-education-powered-production`: `357968b6-ed49-46b4-9751-0e5473385e75`
- Business Worker `brasa-business-powered-production`: `f1f9fbb7-2f6a-444b-aaf5-6b255359761f`
- Government Worker `brasa-government-powered-production`: `7b3cb1ba-db0a-447e-807e-0377f1f9046c`
- Gateway rollback candidate: `5ce4c7d9-4be6-489c-8509-31831bdb315d`
- Gateway approved candidate: `8ecd36ef-07b5-4e8f-90d5-176ce5be47dc`

All reviewed additive migrations succeeded. Thirteen gateway checks covering health, trust, content, lessons, Business composition/providers, and Government services/navigation returned 200 through the production Workers URL. The agreed policy is 90-day usage retention and 400-day audit retention. Alert delivery remains unverified, so the custom domain is not attached and the production gate remains closed.
