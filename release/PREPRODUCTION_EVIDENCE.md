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

## Human or external gates still open

The machine-readable production gate remains authoritative. It requires a release owner and timestamp, production D1 identifier, approved and rollback versions, custom-domain approval, verified production bindings and alerts, approved retention periods, and a named first consumer with scopes, quota, owner, and rollback contact. Cloudflare WAF, phishing-resistant access, restore testing, tenant-isolation evidence, and legal review must be evidenced outside source code.

No production Worker, route, DNS record, database, consumer, or public protection claim may be created merely because this register exists.
