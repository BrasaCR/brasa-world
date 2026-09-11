# `api.brasa.world` production runbook

Production is intentionally blocked until `release/api-production-gate.json` is complete and `npm run release:check` succeeds. The gate records decisions; it must never contain secrets.

## Proposed data policy requiring approval

- Keep aggregate daily consumer usage for 90 days, then delete it. This supports troubleshooting and capacity planning without retaining request content.
- Keep consumer lifecycle audit records for 400 days. They contain consumer identifiers and configuration changes, not API keys, request content, IP addresses, GovID, or learner data.
- Run deletion as a reviewed scheduled maintenance operation; record counts before and after, and never delete active consumer registry rows as part of retention.

These periods are proposals, not active policy. The release owner must approve or replace them in the gate before provisioning production.

## Production provisioning order

1. Identify a release owner and incident contact. Record the reviewed commit and current staging version.
2. Create a dedicated `brasa-api-production` D1 database. Record its ID in the gate and production Wrangler environment; do not reuse staging or any existing GovID, Education, ledger, or registry database.
3. Apply the additive API migrations, verify tables and migration history, and record a D1 Time Travel bookmark before consumer creation.
4. Configure production-only service bindings to the reviewed Education, Business, and Government Workers. Confirm that no binding targets a staging service.
5. Package and deploy a production Worker without a custom domain. Verify its preview/Workers URL, Shield headers, anonymous routes, scope denial, quota enforcement, usage reporting, and cleanup.
6. Configure alerts and test delivery. Required signals are sustained 5xx rate above 2% for five minutes, any dependency-unavailable burst, D1 errors, unusual 401/403 growth, and quota-exhaustion growth. Alerts must contain route templates and request IDs only.
7. Approve the custom domain. Add `{ "pattern": "api.brasa.world", "custom_domain": true }` only to the production environment and deploy. Cloudflare manages the DNS record and certificate; do not also create a conflicting A, AAAA, or CNAME record.
8. Verify TLS, `/health`, OpenAPI, all anonymous domain routes, CORS, cache behavior, and authenticated usage on `api.brasa.world` before issuing the pilot key.

## Controlled first consumer

Choose one server-side integration with a named technical owner and rollback contact. Grant the smallest scope set and a conservative daily quota. Never place the key in a browser, mobile application, URL, ticket, chat transcript, or repository. Verify a successful request, a denied out-of-scope request, `/v1/account/usage`, rotation, and revocation before increasing the quota or onboarding another consumer.

The first 24 hours are a canary. Review 5xx responses, dependency availability, D1 failures, 401/403 changes, quota use, latency, and cache behavior at 15 minutes, one hour, four hours, and 24 hours. Suspend the consumer on anomalous use; revoke it on suspected disclosure.

## Rollback

For code or binding failure, remove the custom-domain deployment or roll the gateway back to the recorded version first. Domain services remain independently accessible. Confirm `/health` and anonymous routes after rollback. Do not drop additive D1 tables.

For corrupt consumer data, suspend affected consumers, capture the current D1 bookmark, and use Time Travel only with an explicitly reviewed target bookmark. Restore into a separate database first, verify consumer status and audit continuity, then schedule a controlled binding change. For key disclosure, revoke the key immediately; database restoration is not appropriate.

The release is complete only after verification evidence, production and rollback version IDs, the Time Travel bookmark, alert delivery, domain status, and first-consumer results are recorded. Production remains blocked if any field in the machine-readable gate is missing.
