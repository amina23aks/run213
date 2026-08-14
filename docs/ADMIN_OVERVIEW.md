# Admin Overview metrics and Firestore cost

`GET /api/admin/overview` uses the canonical verified Firebase ID token plus
`admin === true` authorization boundary. It is private and sent with `no-store`.
The endpoint uses independent settled operations so a failed index/aggregation
is reported as an unavailable metric without discarding successful metrics.

## Definitions and queries

| Metric | Definition | Firestore operation |
| --- | --- | --- |
| Pending orders | Orders where `status == pending` | `count()` |
| Orders today | `createdAtTimestamp` in the half-open current Algeria day `[start, nextStart)` | range `count()` |
| Orders this month | `createdAtTimestamp` in the half-open current Algeria month | range `count()` |
| Month order value | Sum of canonical `totals.totalDzd` for orders created in that month | range `sum()` |
| Low stock | Active, limited products with `0 < stockQty < 5` | filtered `count()` |
| Out of stock | Active, limited products with `stockQty == 0` | filtered `count()` |
| Run Club pending | Submissions whose existing `status == pending` | `count()` |
| Total favorites | Sum of `count` in `favoriteAggregates` | `sum()`; never reads user favorite subcollections |
| Wishlist signups | All documents in `wishlistSignups` | `count()`; no emails returned |
| Most saved item | Highest aggregate count | indexed `orderBy(count desc).limit(1)`, then one item document read for its name |

Month order value is **created COD order value**, not paid or collected revenue.
RUN213 has a payment status field, but it does not establish authoritative COD
collection for every order, so Overview deliberately makes no revenue claim.

Aggregation operations bill aggregation index-entry reads according to
Firestore pricing, with the platform minimum charge. Document downloads remain
constant: zero for counts/sums, plus at most two documents for Most Saved Item.
Runtime and downloaded documents are therefore O(number of metrics), not O(the
number of orders, products, favorites, submissions, or signups).

## Timezone and index

`getAlgeriaCalendarBoundaries` uses the `Africa/Algiers` IANA zone and produces
UTC instants for Algeria-local day/month starts. All ranges are half-open, which
avoids overlap at midnight and month rollover.

Inventory counts require the composite collection index:

1. `status ASC`
2. `stockMode ASC`
3. `stockQty ASC`

It is declared in `firestore.indexes.json`; deployment remains a manual Firebase
operation. No Vercel setting or new service is required.

