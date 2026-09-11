# BRASA API consumer boundary

Public discovery endpoints remain anonymous for schools, low-bandwidth clients, and the credential-free widgets. A registered server-side consumer may additionally send `Authorization: Bearer <BRASA API key>` to receive scoped quota accounting and use `/v1/account/usage`.

API keys are secrets and must never be embedded in a browser, mobile bundle, URL, log, analytics event, or source repository. The registry stores only a SHA-256 digest and a short non-secret prefix. The plaintext key is shown to the consumer once through an approved secure channel.

Supported initial scopes are `content:read`, `education:read`, `business:read`, and `government:read`. Grant only the scopes required by the integration. Quotas use a UTC-day counter and return `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset`; exhausted consumers receive `429` and `Retry-After`.

Issuance is deliberately an operator procedure rather than a public endpoint. Generate at least 256 random bits, format the result as `brasa_test_...` or `brasa_live_...`, store its lowercase SHA-256 hex digest, record a bounded daily limit and JSON scope array, and transmit the plaintext exactly once. Never accept a requested key from a consumer.

Revoke compromised or retired credentials by setting the consumer status to `revoked` and `revoked_at` to the current time. A replacement must be a new random key and registry record; plaintext keys cannot be recovered. Suspension uses status `suspended` and is also fail-closed.

Usage records contain consumer ID, UTC day, aggregate request count, and update time. They contain no GovID, learner data, request URL, query text, IP address, or device identifier. Retention and billing policy remain business decisions and must be approved before production activation.
