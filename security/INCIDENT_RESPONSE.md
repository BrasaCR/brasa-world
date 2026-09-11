# BRASA incident and recovery runbook v0.1

1. Record the incident owner, UTC start time, affected service and tenant scope, request/deployment identifiers, and evidence location. Do not copy secrets or personal data into tickets or chat.
2. Contain through the narrowest predefined action: rate-limit a route, revoke a session/token, disable one binding, isolate one tenant, or roll back one Worker. Preserve logs and database state before remediation.
3. Determine whether identity, credentials, tenant data, secrets, deployments, DNS, backups, or other services were reached. Assume cross-tenant impact is unknown until tested.
4. Eradicate through reviewed configuration or code changes. Rotate only credentials shown or reasonably believed to be exposed, beginning with the narrowest credential.
5. Restore a known-good Worker version or verified backup. Never drop additive migration tables as rollback.
6. Verify the original indicator has stopped, adjacent services remain healthy, tenant isolation still holds, and the attacker did not move laterally.
7. Document impact and required notification without claiming certainty beyond evidence. Add a regression test or detection for the root cause.

Emergency containment may interrupt an affected public endpoint. Database deletion, cryptographic-root changes, organization-wide lockout, backup modification, and broad government-tenant action always require designated human authorization.
