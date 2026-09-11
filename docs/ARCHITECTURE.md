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
