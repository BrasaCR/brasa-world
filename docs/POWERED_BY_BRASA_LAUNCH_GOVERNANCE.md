# Powered by BRASA launch governance

This document is the pre-pilot governance package. It defines what BRASA must approve before a real school, business, or government tenant is selected. A blank signature or evidence field is a closed gate, never implied consent.

## Product and claim boundary

“Powered by BRASA” means the experience uses reviewed BRASA services under explicit product and tenant boundaries. It does not mean BRASA is the institution, regulator, employer, certifier, payment guarantor, or source authority.

“Protected by BRASA” remains prohibited until the Trust status reports `protectedByBrasaClaimApproved: true`. The claim requires recorded production authentication, WAF and alert tests, tenant-isolation evidence, backup restoration, incident response, and approved retention. A staging test or written plan alone is not evidence of continuous protection.

## Required organizational approvals

| Decision | Required owner | Evidence | Status |
| --- | --- | --- | --- |
| Production release and rollback | BRASA administrator | Approved commit and version IDs | Open |
| Usage and audit retention | BRASA administrator | Dated policy decision | Open |
| Privacy and data processing | Qualified counsel + BRASA administrator | Reviewed privacy package | Open |
| Child safeguarding, when applicable | Pilot institution | Named safeguarding lead and escalation path | Open |
| Incident response | BRASA administrator | Alert test and tabletop record | Open |
| Recovery | BRASA administrator + independent recovery custodian | Restore and account-recovery evidence | Open |
| Tenant isolation | BRASA engineering | Denied cross-tenant read/write/export test | Open |
| Public badge activation | BRASA administrator | Trust-status approval change | Open |

## Minimum tenant agreement

Before onboarding, record the tenant’s legal name, country, domain, authorized administrator, support contact, data roles, enabled BRASA products, supported locales, permitted user groups, retention requirements, incident contacts, export/termination process, and prohibited uses. The tenant must acknowledge that civic guidance is informational, marketplace records are not endorsements, learning content is not accreditation, and identity access does not itself grant tenant authorization.

## Education-specific gate

Before real learners are admitted, document the lawful basis and consent model; guardian process where required; learner age range; safeguarding lead; record categories; deletion and correction process; accessibility accommodations; staff training; content-review responsibility; and incident escalation. A qualified reviewer must determine applicable Costa Rican education, privacy, consumer, accessibility, and child-protection obligations. BRASA must not represent this checklist as legal advice or legal approval.

## Pilot evidence packet

The eventual pilot packet must contain:

1. Signed tenant authorization and named contacts.
2. Data-flow and enabled-feature inventory.
3. Two-tenant isolation test results using synthetic records.
4. Authentication, session revocation, role, and recovery results.
5. Backup restore and Worker rollback timestamps.
6. Alert delivery and incident tabletop record.
7. Accessibility and low-bandwidth verification.
8. Approved retention and deletion schedule.
9. Badge verification URL and exact allowed claim text.
10. Exit, export, and credential-revocation confirmation.

## Activation rule

The first tenant may be marked `Powered by BRASA — Pilot` only after its packet is complete and the production gate passes. Remove the badge when the tenant is suspended, the verification record expires, or a material control fails. “Protected by BRASA” requires a separate explicit approval after the security evidence above is current.
