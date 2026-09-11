# BRASA staged release plan

## Canonical source status

`brasa-world` and `brasa-business` have canonical Git histories and isolated implementation branches. Canonical GitHub repositories also exist for Education, Government, and Signup, but the local Education and Government deployment directories contain newer uncommitted structures than their remote `main` branches. Import those changes as reviewed commits; never replace remote history with the provisional root snapshots.

## Dependency order

1. Reconcile `C:\Brasa\brasa-education` with `BrasaCR/brasa-education`; apply the Phase 4 migration, Pages Functions, tests, D1 binding, and `IDENTITY` service binding.
2. Deploy and smoke-test `brasa-education` public lessons before enabling the gateway binding.
3. Review and deploy `codex/phase6-business-experiences` from `brasa-business`; smoke-test `/api/v1/opportunities`.
4. Reconcile `C:\Brasa\brasa-government` with `BrasaCR/brasa-government`; deploy the restricted asset build and smoke-test `/api/v1/services`.
5. Merge the `brasa-world` implementation branch, build API assets, deploy `brasa-content-api`, and bind the confirmed `api.brasa.world` route.
6. Verify `/health`, all four OpenAPI paths, CORS preflights, cache headers, widget loading, and that authenticated/private requests never enter a service-worker cache.

No database migration or route change should be performed implicitly. Back up D1 before migration, apply migrations to a preview database first, and verify tenant-bound authorization with two distinct schools before production.

## Rollback boundary

Each Worker deploy is independently reversible. Roll back the central gateway first if an integration fails; bound Education, Business, and Government sites continue operating directly. Database migrations in this milestone are additive and must not be rolled back by dropping tables.

## Staging gate

The manual `Deploy staging` workflow is the only automated deployment entry point. It always selects Wrangler's named `staging` environment, whose gateway binds only to `*-staging` services and a separate analytics dataset. Configure protected GitHub environment secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `STAGING_BASE_URL`; optionally set `STAGING_SCHOOL_ID` to a published preview tenant. The workflow tests and packages before deployment, then exercises health, Education, Business, and Government through the public gateway. It contains no production deployment command.
