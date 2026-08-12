# Firestore performance and cost audit

Audited against the repository on 2026-08-12. Read counts below are document reads unless explicitly called an aggregate query. Checkout always re-reads canonical products/looks in its transaction; the public cache is never checkout authority.

## Access inventory and cost model

| Flow | Collections and query | Bound / pagination | Expected reads and scaling |
|---|---|---|---|
| Home products | `products where status == active limit 60`; placement/promo filtering in the cached result | 60, shared 60-second `products` cache | 0 on cache hit; <=60 per cache fill, O(1) bounded |
| Home looks | `lookCollections status=active limit 60`; `looks status=active, showAsHomepageFigure=true limit 60` | hard bound, no pagination | <=120 per request, O(1) bounded (remaining cache opportunity) |
| Shop | cached active product catalog, returns first 12 | 60 source bound | 0 hit / <=60 cache fill, O(1) bounded |
| Product detail | `products slug == value, status == active limit 1`; related list uses cached catalog | 60-second tagged cache | 0 hit / 1 slug read plus at most one 60-doc catalog fill |
| Look collection | collection slug/status limit 1; looks collectionId/status limit 60; unique product IDs resolved in `in` chunks of 30 | hard bounds; no UI pagination | 1 + <=60 looks + <=unique product IDs, O(page bound); no per-look N+1 |
| Look detail | look slug/status limit 1; product IDs resolved in `in` chunks of 30 | look product list schema-bounded | 1 + unique products; batching avoids per-card requests |
| Favorites resolve | products/looks resolved from deduplicated IDs in `in` chunks | request schema caps 80 products + 80 looks | <=160 target reads, O(request cap), no per-card requests |
| Run Club public | month/status, approvedAt desc, limit `3 * display limit`; month doc and up to 3 winner docs | hard bound; 60-second tagged cache | feed <=36 for default 12; status 1; winners <=4; O(1) bounded |
| Customer orders list | UID equality, created timestamp desc + document ID desc, limit 11/startAfter; guest IDs direct-read capped at 10 | cursor pages of 10 | auth <=11/page; guest <=10, O(page) |
| Order detail/edit/cancel | direct order document; mutations use transaction; item option edit also reads one canonical product; stock restoration reads each unique limited-stock product | direct IDs | 1 order plus O(unique affected products), never catalog-wide |
| Customer favorites | owner-only `users/{uid}/productFavorites` and `lookFavorites`; guest localStorage; resolve is bulk endpoint | browser rules and resolve caps 80+80 | O(favorite cap); aggregate transaction adds target + aggregate reads/writes |
| Customer Run Club | UID equality, createdAt/id desc, limit 9/startAfter | cursor pages of 8 | <=9/page, O(page) |
| Guest order claim | supplied order IDs direct-read/transaction validation | input schema bounded | O(claim request size), not O(all orders) |
| Admin overview | UI currently placeholder/config-oriented, no collection-wide dashboard scan | n/a | O(1) |
| Admin products | sortOrder/id asc, page size + 1/startAfter | cursor pagination | O(page size); detail direct read |
| Admin collections/looks | sortOrder/id asc, 21/startAfter | cursor pagination | <=21/page; mutation product validation remains O(selected products) direct reads |
| Admin orders | optional status and search-token constraints, createdAt/id desc, limit <=51/startAfter | cursor pagination | O(page size); detail is 1 read |
| Admin favorites | optional type equality, count desc/id asc, limit 21/startAfter; `getAll` hydrates only displayed aggregate targets; two sum aggregations | cursor pages of 20 | <=21 aggregate docs + <=20 target docs/page; O(page), no customer-favorite scan or catalog scan |
| Admin wishlist | createdAt/id desc, limit 26/startAfter plus count aggregation; search filters loaded rows only | cursor pages of 25 | <=26/page + count aggregation, O(page) |
| Admin Run Club moderation | month/status (or moderationState), createdAt desc, <=21/startAfter | cursor pages <=20 | O(page) |
| Admin Run Club summary/draw | three count aggregations, month doc, approved month query capped at approval cap + 1, up to 3 winner reads | maximum 51 eligible docs | O(monthly cap), never historical-total |
| Admin settings/config | direct singleton configuration documents | direct IDs | O(1) |
| Checkout | idempotency lock/order reads; transaction reads each unique product and look, validates snapshots, writes order/lock and stock changes | cart schema bounded | O(unique cart products + looks); correctness-critical |
| Wishlist mutation | deterministic HMAC document ID, transaction read then conditional write | direct ID | 1 read, at most 1 write |
| Run Club mutation | deterministic submission and UID/month lock plus one legacy compatibility query limited to 1; upload grant/rate-limit transactions | direct IDs / limit 1 | O(1) reads and writes |
| Admin mutations | direct target reads, slug uniqueness limit 1/2, transactional order/run moderation | hard bounds | O(1) except selected product/stock sets |

## Findings and changes

### Largest risks before this sprint

1. Admin Favorites read 200 aggregates, hydrated every target, sorted and filtered them, then returned 20. A request cost up to about 400 reads and its ranking silently ignored aggregates after the first 200.
2. Admin Wishlist read the newest 250 documents on every request and used offsets/search in memory, so every 25-row page could cost 250 reads.
3. Home Drop and Promo components independently fetched and filtered the same 60-product active catalog; Shop and related products repeated it on every dynamic request.
4. Run Club summary/draw and legacy UID duplicate checks contained queries without hard limits. The monthly approval cap made the former operationally small, but the query itself did not enforce that bound; UID history grew one read per month.

### Implemented before/after behavior

- **Favorites:** 200 aggregate + up to 200 hydration reads per request became a stable count/id cursor query of 21 + `getAll` hydration of at most 20. Type filtering is applied in Firestore. Name search is intentionally client-side over already-loaded bounded rows. Missing/archived targets stay visible as unavailable/archived and do not trigger catalog reads. Exact save totals use two Firestore sum aggregations; no per-user favorites are scanned.
- **Wishlist:** newest-250 scan and offset slicing became createdAt/document-ID cursor pagination of 26 reads for 25 results. Search only filters already-loaded rows, avoiding a refetch per search. The HMAC document ID and delete behavior are unchanged.
- **Run Club:** approved-month materialization in summary/draw/append is capped at `RUN_CLUB_MAX_APPROVED + 1` (51). Legacy duplicate checks now use UID + month and `limit(1)` instead of reading the account's entire submission history. Public feed and moderation were already bounded; owner activity was already cursor-paginated.
- **Storefront products:** the active 60-product result and slug lookups now use a 60-second Next data cache tagged `products`. Existing Admin mutations already invalidate that tag. This coalesces Home Drop/Promo and repeat page traffic without changing checkout authority, pricing, or stock validation.

## Unbounded queries and N+1 results

No remaining ordinary list page performs an unbounded document query. Firestore `count()`/`sum()` aggregations intentionally cover their matching index ranges but do not download every document. Direct document reads and document-ID `in` batches are bounded by input/page schemas.

Remaining fan-out (not unsafe list scans): checkout/order cancellation reads each unique stock-bearing product transactionally; winner rendering reads at most three known submission IDs; Admin look mutations validate each selected product with separate parallel direct reads. These scale with bounded user-selected item counts, preserve transactional correctness, and are not page-size-times-child N+1 patterns. Look storefront hydration and Favorites resolution deduplicate IDs and batch them in `in` queries; Admin Favorites uses `getAll`.

## Index review and manual action

Existing indexes already cover orders, public/moderated/owned Run Club lists, look ordering, and all-type favorite count ordering. Added only:

- `favoriteAggregates`: type ASC, count DESC, document ID ASC (typed ranking cursor).
- `runClubSubmissions`: customerUserId ASC, monthKey ASC (bounded legacy UID/month integrity lookup).

Deploy manually after review; this sprint does not deploy indexes:

```bash
firebase deploy --only firestore:indexes
```

No Vercel, Upstash, schema backfill, Redis, or paid-service action is required. Keep the existing product/run-club tag invalidations deployed with the application.

## Remaining risks and launch assessment

- Active products and each look collection are deliberately capped at 60; a future catalog above that size needs real storefront cursor/search pagination rather than raising the cap.
- Look public reads are bounded but not yet cached, so a collection page costs one collection read, up to 60 look reads, and unique product hydration on every request.
- Aggregate count/sum queries scan index entries according to Firestore aggregation billing; they are vastly smaller payloads than document scans but should still be monitored.
- Admin Favorites name search covers loaded pages, not the entire aggregate collection. Global server search would require normalized-name denormalization and a migration, which is not justified now.
- Guest order list direct reads are capped but fan out to up to ten document gets.

At the current expected V1 scale, RUN213 is performance/cost-safe for launch: all user/admin lists are O(page size) or have explicit small caps, repeated public product reads are cached, and checkout/security authority remains uncached and transactional. Monitor cache hit rate, Favorites aggregate growth, and the 60-item storefront ceiling as the catalog grows.
