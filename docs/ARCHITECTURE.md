# BRASA shared architecture

BRASA is a family of interoperable products, not one undifferentiated application. World owns public discovery and country routing; Education owns lessons, schools, curricula, and capability evidence; Business owns marketplace and business operations; Government owns civic knowledge and public services; Signup/GovID owns identity, authentication, credentials, and consent; Engine is build-time infrastructure only.

## Phase 1 foundation

`content/catalog.json` is generated from the working pages, so the content engine indexes BRASA's existing investment rather than replacing it. Each record has a stable ID, canonical URL, locale, optional ISO country code, content kind, product pillar, and offline eligibility. `content-record.schema.json` is the versioned contract future repositories and APIs can consume.

The catalog carries no user data, authorization token, learning history, transaction, or unpublished administrative content. Those remain behind their owning service's authentication and permissions boundary.

## Cross-cutting rules

- English remains the maintained source until a translation has explicit locale, review state, and provenance. Locale is request data, never inferred from identity.
- Public content works without authentication. GovID is requested only for personalized or write operations, using minimum scoped claims.
- Static content is offline-eligible. Mutable ledgers, private records, credentials, and administrative responses are network-only and never enter a shared cache.
- Contracts are versioned and additive; consumers ignore unknown fields.
- Analytics are aggregate and content-free: never record GovID, phone, lesson text, or capability-share tokens.
- HTML remains the accessibility baseline. Enhancements preserve keyboard navigation, reduced motion, semantic headings, contrast, and low-data use.

## Next executable milestone

Phase 1.1 adds source paths and SHA-256 change detection, explicit translation state, and a read-only Worker endpoint. `GET /v1/content` supports bounded pagination and exact filters for country, locale, pillar, and kind; `GET /v1/content/:id` returns one record. Only approved BRASA origins receive cross-origin access. Public results are cacheable, errors are not, and optional analytics contain only endpoint/count/version aggregates.

## Next executable milestone

Phase 2 should generate canonical URLs, sitemap partitions, and structured metadata from the catalog, while converting the 208 missing legacy descriptions into a reviewed editorial queue rather than inventing or bulk-publishing copy.

## Phase 2 distribution foundation

The SEO build produces a sitemap index with country, Human Capability, BRASA Open, and general World partitions. It also produces canonical/Open Graph/Schema.org records for later HTML injection and a source-hash-linked editorial queue. It never advertises locale routes merely because a translated README exists; `hreflang` is published only when an actual reviewed localized page is present.

## Phase 3 PWA foundation

The existing HTML homepage remains the application shell. Its manifest and service worker add installation, network-first offline pages, safe static-asset caching, and an accessible offline fallback without a framework dependency. Requests carrying cookies or authorization and routes for APIs, GovID, credentials, payments, reports, metrics, webhooks, and live ledgers bypass caches. Responses marked private/no-store or setting cookies are also ineligible. Updates install in the background and emit `brasa:update-ready`; the interface can choose when to activate them without interrupting a learner.

## Phase 5 Education API and widgets

`api.brasa.world` reaches Education through the `EDUCATION` service binding, never a public REST hop. The first endpoint streams published lesson responses at `GET /v1/education/lessons?schoolId=&locale=` and exposes wildcard CORS because it is public, credential-free embed data. Validation occurs before the binding call; upstream errors are sanitized. The `<brasa-lessons>` web component omits credentials, escapes content through DOM text nodes, isolates styles, announces loading/error state, and requires no framework.

## Phase 6 Business-powered experiences

The `BUSINESS` service binding exposes public category pathways through `GET /v1/business/pathways`. Capability and country filters are visitor-selected inputs, not inferred learner data. No GovID, school membership, credential, or progress crosses the boundary. The companion widget renders safe links to BRASA Business and can be embedded independently of Education authentication.

## Phase 7 Government-powered experiences

The `GOVERNMENT` service binding exposes anonymous civic navigation through `GET /v1/government/services`. Results retain source URLs and review status, are labeled informational, and never determine eligibility. Unsupported countries fail closed. The widget accepts only visitor-entered query/category/country inputs, omits credentials, restricts outbound protocols, and sends no GovID activity or political profile.

## BRASA Shield foundation v0.1

The gateway applies one security-response policy to every route, rejects oversized request surfaces before binding calls, and correlates failures using Cloudflare Ray IDs or cryptographically random request IDs. Security events contain route templates, status, severity, method, and duration only—never IP addresses, raw queries, cookies, authorization values, GovID, or phone data. Operational threat, incident, and recovery documents live in `security/`. Production rate limits remain a Cloudflare WAF deployment requirement because an in-isolate counter would be neither global nor reliable.
