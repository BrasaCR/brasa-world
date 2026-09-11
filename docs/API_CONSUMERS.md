# BRASA API consumer boundary

Public discovery endpoints remain anonymous for schools, low-bandwidth clients, and the credential-free widgets. A registered server-side consumer may additionally send `Authorization: Bearer <BRASA API key>` to receive scoped quota accounting and use `/v1/account/usage`.

API keys are secrets and must never be embedded in a browser, mobile bundle, URL, log, analytics event, or source repository. The registry stores only a SHA-256 digest and a short non-secret prefix. The plaintext key is shown to the consumer once through an approved secure channel.

Supported initial scopes are `content:read`, `education:read`, `business:read`, and `government:read`. Grant only the scopes required by the integration. Quotas use a UTC-day counter and return `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset`; exhausted consumers receive `429` and `Retry-After`.

Issuance is deliberately an operator procedure rather than a public endpoint. It uses the locally authenticated Cloudflare session and the staging database directly. The tool generates 256 random bits, stores only the lowercase SHA-256 hex digest, records a bounded daily limit and JSON scope array, and displays the plaintext exactly once. Never accept a requested key from a consumer.

Run `npm run consumer -- create --name "Partner name" --scopes education:read,content:read --limit 10000 --kind test` to issue a staging key. Use `list`, `suspend <consumer-id>`, `resume <consumer-id>`, `revoke <consumer-id>`, or `rotate <consumer-id> --kind test` for lifecycle management. List output deliberately excludes key digests. Create and rotate output contains the secret once and must be handled as sensitive terminal output.

Revoke compromised or retired credentials with the operator tool. Rotation revokes the old record before adding its replacement, favoring fail-closed behavior if an external operation is interrupted. Plaintext keys cannot be recovered. Suspension uses status `suspended` and is also fail-closed. Every lifecycle mutation writes a content-free audit record containing the consumer ID, action, bounded configuration snapshot, and timestamp.

Usage records contain consumer ID, UTC day, aggregate request count, and update time. They contain no GovID, learner data, request URL, query text, IP address, or device identifier. Retention and billing policy remain business decisions and must be approved before production activation.
