# Ember recovery checklist

- Cloudflare: export account/service inventory; maintain independently protected owner recovery and verify Worker rollback.
- GitHub: protect main branches; require reviewed changes; maintain an independent repository inventory and organization recovery path.
- D1: define backup frequency, retention, restoration owner, recovery-point objective, and recovery-time objective; perform a preview restore.
- DNS and certificates: document registrar recovery, authorized contacts, domain-lock status, and last verification date.
- GovID signing: keep root private material offline; document intermediate revocation and replacement without copying private material into this repository.
- Secrets: inventory owners and consumers by secret name only; test narrow rotation and service recovery.
- AI providers: ensure public content and core navigation continue without an AI provider.
- Tenants: verify isolation using two schools, two businesses, and two government tenants before claiming “Protected by BRASA.”
