# BRASA branch reconciliation record

Verified 2026-09-11 before pilot selection.

| Repository | Implementation branch | Merge state | Verification |
| --- | --- | --- | --- |
| `brasa-world` | `codex/phase1-content-engine` | Linear, no commits behind `origin/main` at fetch | 41 tests, build, package, and full staging smoke passed |
| `brasa-education` | `codex/phase4-school-platform` | Linear, no commits behind `origin/main` at fetch | 29 tests, 22-asset build, and package passed |
| `brasa-business` | `codex/phase6-business-experiences` | 17 newer `origin/main` commits merged without code conflict | 53 tests and package passed; repository has no `build` script |
| `brasa-government` | `codex/phase7-government-experiences` | Linear, no commits behind `origin/main` at fetch | 25 tests, 102-asset build, package, and live staging checks passed |
| `brasa-signup` | `codex/identity-staging` | Linear, no commits behind `origin/main` at fetch | 225 tests passed |

No remote branch or `main` branch was modified by this reconciliation. Publishing these repositories to GitHub is an external data transfer and requires explicit approval for the five named repositories and destinations. After publication, use protected pull requests; do not force-push or bypass required review. Re-run each repository’s tests against the final merge commit before production approval.
