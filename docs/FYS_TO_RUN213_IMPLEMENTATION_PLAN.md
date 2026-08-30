# Fish Your Style to 213 RUN — Technical Migration and Audit Plan

> **Source of truth:** `AGENTS.md` in this 213 RUN repository.  
> **Reference only:** Fish Your Style repository code. Reuse proven commerce/backend/admin logic concepts only. Do not reuse its UI, theme, old brand, assets, products, categories, or unnecessary legacy features.

## A) Executive summary

### What should be reused

- **Cart state architecture:** localStorage-backed cart context, variant-key deduplication, quantity clamping, subtotal calculation, remove/update/clear actions, and hydration-safe client loading.
- **Favorites architecture:** localStorage-first favorites with optional authenticated Firestore sync later. Keep the merge-on-login concept, but rename storage keys and payloads for 213 RUN.
- **Server order architecture:** order creation through a Route Handler only, Firebase Admin SDK server-side writes, transaction-based stock checks/decrements, server-calculated subtotal/shipping/total, and admin stats updates.
- **Customer order controls:** pending-only customer update/cancel behavior enforced by the server, not only the UI.
- **Algeria COD utilities:** Algeria phone validation and wilaya/shipping lookup concepts, adapted to 213 RUN checkout fields.
- **Admin product/order concepts:** paginated product and order data access, status update flow, product variant/stock fields, admin-only mutations, and CSV export concepts.
- **Admin analytics aggregation:** `adminStats/summary` and `adminStatsDaily` write-time aggregation concepts to avoid expensive dashboard scans.
- **Firebase Admin helper pattern:** central server-only Admin SDK initializer, ID token verification, and admin custom-claim guard.
- **Firestore rules baseline:** public read for active catalog products only, no direct client order creation, owner/admin reads for sensitive records, admin-only writes for privileged collections, and catch-all deny in 213 RUN.
- **Cloudinary delivery helpers:** transformed delivery URL concepts for optimized card/detail thumbnails.
- **API protection helpers:** rate limiting, request body shape checks, string normalization, email validation, honeypot detection, and generic error responses.
- **Export pattern:** bounded CSV export for orders, protected by admin token or explicit export token if owner needs automations.

### What should be redesigned

- **All public UI and admin UI:** cart drawer, checkout, favorites, orders, product cards, admin shell, admin product forms, admin order tables, and charts must be redesigned in the approved 213 RUN visual language.
- **Product taxonomy:** use 213 RUN categories only: `tshirts`, `pants`, `hoodies`, `accessories`.
- **Product schema names:** use 213 RUN product fields such as `priceDzd`, `compareAtPriceDzd`, `dropSlug`, `stockMode`, `colors`, `sizes`, and `images`.
- **Order schema:** keep COD/wilaya concepts but adapt labels, statuses, items, shipping, and customer fields to 213 RUN.
- **Admin analytics categories:** remove old category/design-theme assumptions; aggregate 213 RUN categories, product names, status counts, revenue, COGS, and net profit.
- **Cloudinary upload flow:** replace any direct unsigned browser upload with signed/admin-mediated uploads and strict community upload caps.
- **Security layer:** harden public endpoints with Turnstile before launch, durable rate limiting, idempotency keys for orders, variant validation, and logging of blocked attempts.

### What should be avoided

- Do not copy Fish Your Style UI/UX, blue theme, assets, old brand copy, product names, category names, design themes, hero/navbar/footer, legal/FAQ content, or old homepage structure.
- Do not copy the entire repository.
- Do not expose Firebase service account/private keys to the client.
- Do not allow direct client writes for orders, contact messages, wishlist signups, run club submissions, or admin resources.
- Do not trust client-submitted prices, shipping cost, stock status, order totals, product names, color labels, size labels, or admin status changes.
- Do not retain open/unsigned Cloudinary uploads as a final implementation.
- Do not load all orders/products/submissions at once in admin pages.
- Do not make run club submissions public immediately.

## B) 213 RUN target architecture

- **Frontend:** Next.js App Router with approved 213 RUN UI, server components where safe, client components only for interactive commerce state.
- **Backend:** Next.js Route Handlers under `/api/*` for all mutations and sensitive reads.
- **Database:** Firestore for products, orders, favorites, subscribers, run club submissions, admin stats, and users.
- **Auth:** Firebase Auth for admin. Client/customer auth is optional for V1; guest order lookup can use order ID plus customer verification token or authenticated account later.
- **Server SDK:** Firebase Admin SDK used only inside server-only utilities and Route Handlers.
- **Images:** Cloudinary for product images, brand media, and community proof uploads. Firestore stores URLs, public IDs, dimensions, alt text, and transform metadata only.
- **Hosting:** Vercel for Next.js. Use Vercel environment variables for Firebase public config, Admin SDK credentials, Cloudinary keys, Turnstile keys, and optional export token.
- **Static/cache strategy:** public product reads can be cached/revalidated where safe; admin and customer-sensitive data should be dynamic and authenticated.

## C) Data model proposal

### `products`

Catalog source for storefront and admin product dashboard.

```ts
type Run213Product = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  details?: string[];
  category: "tshirts" | "pants" | "hoodies" | "accessories";
  status: "draft" | "active" | "archived";
  priceDzd: number;
  compareAtPriceDzd?: number | null;
  costPriceDzd?: number | null;
  images: ProductImage[];
  colors: ProductColor[];
  sizes: ProductSize[];
  stockMode: "unlimited" | "limited" | "made_to_order";
  stockQty?: number;
  inStock: boolean;
  featured?: boolean;
  isPromo?: boolean;
  dropSlug?: "drop-001";
  sortOrder?: number;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
};
```

### `categories`

Optional admin-manageable metadata for shop tabs/category pages. V1 can also keep these constants in code.

```ts
type Run213Category = {
  id: "tshirts" | "pants" | "hoodies" | "accessories";
  label: "T-Shirts" | "Pants" | "Hoodies" | "Accessories";
  slug: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
};
```

### `orders`

Prefer embedding order items in each order for simple reads and immutable snapshots. Separate `orderItems` is only needed later for large reporting pipelines.

```ts
type Run213OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

type Run213Order = {
  id: string;
  orderNumber: string;
  userId?: string | null;
  customerEmail?: string | null;
  customerEmailNormalized?: string | null;
  customerName: string;
  phone: string;
  shipping: {
    wilaya: string;
    commune?: string;
    address: string;
    mode: "home" | "desk";
    priceDzd: number;
  };
  items: Run213OrderItem[];
  subtotalDzd: number;
  shippingCostDzd: number;
  totalDzd: number;
  paymentMethod: "COD";
  status: Run213OrderStatus;
  notes?: string;
  idempotencyKey?: string;
  source: "web";
  costOfGoodsSoldDzd?: number;
  netProfitDzd?: number;
  profitSnapshotComplete?: boolean;
  cancelledAt?: FirebaseTimestamp;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
};
```

### `orderItems` if needed

Only add if reporting/export needs collection-group queries at scale. For V1, embedded order items are simpler and cheaper.

```ts
type Run213OrderItemDocument = Run213OrderItem & {
  orderId: string;
  createdAt: FirebaseTimestamp;
};
```

### `favorites`

For optional authenticated sync. V1 favorites should work with localStorage without login.

```ts
type Run213FavoritesDocument = {
  userId: string;
  items: Array<{
    productId: string;
    slug: string;
    name: string;
    image?: string;
    priceDzd: number;
    inStock: boolean;
    addedAt: string;
  }>;
  updatedAt: FirebaseTimestamp;
};
```

### `wishlist` / `subscribers`

Use one collection name consistently. Recommended: `subscribers` for newsletter/early access and `wishlistSignups` only if preserving AGENTS.md naming. Public writes go through API only.

```ts
type Run213Subscriber = {
  id: string;
  email: string;
  emailNormalized: string;
  source: "footer" | "wishlist" | "drop";
  status: "active" | "unsubscribed";
  ipHash?: string;
  userAgentHash?: string;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
};
```

### `runClubSubmissions`

```ts
type RunClubSubmission = {
  id: string;
  campaignMonth: string; // YYYY-MM
  name: string;
  instagram?: string;
  distanceKm: number;
  time?: string;
  note?: string;
  proof: {
    cloudinaryPublicId: string;
    secureUrl: string;
    thumbnailUrl: string;
    format: string;
    bytes: number;
  };
  status: "pending" | "approved" | "rejected";
  moderationNote?: string;
  approvedAt?: FirebaseTimestamp;
  rejectedAt?: FirebaseTimestamp;
  ipHash?: string;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
};
```

### `adminStats`

```ts
type AdminStatsSummary = {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  revenueDzd: number;
  costOfGoodsSoldDzd: number;
  netProfitDzd: number;
  totalProducts: number;
  activeProducts: number;
  totalSubscribers: number;
  totalRunClubSubmissions: number;
  updatedAt: FirebaseTimestamp;
};
```

### `adminStatsDaily`

```ts
type AdminStatsDaily = {
  dateKey: string; // YYYY-MM-DD Africa/Algiers
  orders: number;
  revenueDzd: number;
  costOfGoodsSoldDzd: number;
  netProfitDzd: number;
  cancelled: number;
  returned: number;
  topCategories: Record<"tshirts" | "pants" | "hoodies" | "accessories", number>;
  topProducts: Record<string, { name: string; qty: number; revenueDzd: number }>;
  updatedAt: FirebaseTimestamp;
};
```

### `users` if needed

```ts
type Run213User = {
  uid: string;
  email?: string;
  role?: "customer" | "admin";
  orderCount?: number;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
};
```

### `rateLimits` if needed

Use Firestore TTL, Upstash, Vercel KV, or Redis for production. In-memory limiting is acceptable only during early development.

```ts
type RateLimitRecord = {
  key: string;
  endpoint: string;
  count: number;
  windowStart: FirebaseTimestamp;
  expiresAt: FirebaseTimestamp;
};
```

## D) API routes proposal

### Public/customer routes

- `POST /api/orders`
  - Creates COD order through server only.
  - Validates cart items, product status, variants, quantity, wilaya, phone, address, notes, honeypot, Turnstile, and idempotency key.
  - Recalculates product prices, subtotal, shipping, total, COGS, and stock.
  - Uses Firestore transaction for order creation and stock decrement.

- `GET /api/orders/[id]`
  - Customer order detail read.
  - Require authenticated owner, or order lookup token if guest lookup is introduced.
  - Do not expose internal profit fields to customers.

- `PATCH /api/orders/[id]` *(recommended even though not in the requested minimum list)*
  - Customer pending-only shipping/contact edit or cancel.
  - Admin status update can share route only if role branching is very clear; otherwise use admin-specific route below.

- `GET /api/customer/orders`
  - Authenticated customer order history, paginated by `createdAt desc`.
  - Optional email-based lookup must be carefully verified; prefer authenticated users.

- `POST /api/favorites`
  - Authenticated favorite sync. V1 localStorage can work before this route is implemented.
  - Validates product ID and stores a bounded list.

- `DELETE /api/favorites`
  - Removes one favorite or clears all for authenticated user.

- `POST /api/wishlist`
  - Newsletter/early access signup.
  - Validates email, source, honeypot, Turnstile, rate limit, and dedupes by normalized email.

- `POST /api/run-club/submit`
  - Public run club submission.
  - Requires strict validation, Turnstile, rate limit, campaign cap, image upload policy, and creates `pending` submission only.

### Admin routes

- `POST /api/admin/products`
  - Admin-only create product.
  - Validates category, slug uniqueness, status, prices, images, colors, sizes, stock fields.

- `PATCH /api/admin/products/[id]`
  - Admin-only product update/archive/stock edit.
  - Prevents invalid active product states, e.g. no image, no category, missing price.

- `DELETE /api/admin/products/[id]`
  - Prefer soft archive over hard delete unless owner confirms.

- `GET /api/admin/orders`
  - Admin-only paginated orders with filters: status, date range, cursor, search by order/customer/phone.

- `PATCH /api/admin/orders/[id]`
  - Admin-only status updates, return cost updates, and admin notes.
  - Updates aggregate stats carefully and idempotently.

- `POST /api/admin/cloudinary/sign`
  - Admin-only signed upload parameters.
  - Restricts folder, transformation, max bytes, and formats.

- `PATCH /api/admin/run-club/[id]`
  - Admin-only approve/reject pending run club submissions.

- `GET /api/admin/stats`
  - Admin-only summary and daily stats for dashboard.
  - Reads aggregate docs, not all orders.

- `GET /api/admin/export/orders`
  - Admin-only bounded CSV export.
  - Supports `since`, `status`, and `max` with hard caps.

## E) Security plan

- **No direct client writes for orders.** All order creation must happen through `POST /api/orders` using Admin SDK.
- **Server validation for all public endpoints.** Validate request shape, field types, string lengths, enum values, and numeric limits.
- **Turnstile before final launch** on:
  - checkout/order submit
  - contact
  - wishlist/newsletter
  - run club submission
- **Rate limiting per IP + endpoint.** Suggested starting limits:
  - `/api/orders`: 5/hour per guest IP, 10/hour per authenticated user.
  - `/api/wishlist`: 3/hour per IP plus email dedupe.
  - `/api/run-club/submit`: 1–2/hour per IP plus monthly campaign cap.
  - `/api/contact`: 3/10 minutes per IP.
  - `/api/admin/cloudinary/sign`: 30/hour per admin.
- **Admin auth.** Admin routes require Firebase ID token and `admin === true` custom claim. UI hiding is not security.
- **Firestore rules.** Deny sensitive writes from the client. Public can read only `products` where `status == "active"`. Direct client create/update/delete for orders, subscribers, contact, run club, admin stats, and products should be denied except for carefully scoped admin rules.
- **Admin SDK server-only.** Keep Admin SDK in server-only modules. Never import it into client components.
- **Secret handling.** Never expose service account JSON/private key, Cloudinary API secret, Turnstile secret, or export token to the browser.
- **Order validation.** Validate product ID, slug, size, color, quantity, wilaya, delivery mode, address, phone, and optional notes. Quantity must be bounded per line and per order.
- **Trust server data only.** Ignore client price, compare-at price, product title, shipping price, COGS, and stock status as sources of truth.
- **Stock transaction.** For limited stock products, read current product in transaction, verify stock, decrement stock, and create order atomically.
- **Idempotency.** Accept idempotency key for checkout submissions and reject/reuse duplicate recent keys.
- **Honeypot.** Add optional hidden fields to public forms as a low-cost bot signal.
- **Logging.** Log blocked attempts with endpoint, reason, timestamp, hashed IP, and user ID if authenticated. Do not log raw secrets or full payment-sensitive data.

## F) Cloudinary plan

- Use Cloudinary for product images, brand media, and run club/community uploads.
- Product dashboard uploads must go to Cloudinary, not Firestore as raw images.
- Firestore stores metadata and URLs only: `publicId`, `secureUrl`, `width`, `height`, `format`, `bytes`, `alt`, `dominantColor`, and generated transform URLs if useful.
- Use transformed URLs:
  - **Cards/thumbnails:** `w_480,f_auto,q_auto,c_fill`.
  - **Detail medium:** `w_1200,f_auto,q_auto,c_fit`.
  - **Admin thumbnails:** `w_180,f_auto,q_auto,c_fill`.
  - **Original:** only for admin/download if needed.
- Admin uploads should use signed upload parameters from `POST /api/admin/cloudinary/sign`.
- Do not keep direct unsigned browser uploads as final behavior.
- Run club submissions:
  - Use folder such as `run213/community-pending/YYYY-MM`.
  - Enforce file format and file size limits.
  - Enforce monthly cap such as first 26 or 50 valid pending submissions per campaign.
  - Store submissions as `pending` only.
  - Manual admin approval required before public display.
  - Optional moderation can be added later.
- Do not use Firebase Storage for user uploads unless explicitly chosen later.

## G) Cost/performance plan

- Cache/revalidate public product lists where safe. Active product pages can use static generation or short revalidation after backend is stable.
- Use Firestore reads carefully: query only active products for storefront, paginated by category/sort.
- Use `adminStats` and `adminStatsDaily` aggregation to avoid expensive dashboard scans.
- Use load-more/pagination patterns:
  - Storefront products: initial 8–12, then load more.
  - Admin orders/products: cursor-paginated, 25–50 per page.
  - Community submissions: limited public gallery, admin paginated queue.
- Avoid loading all orders/products/submissions at once.
- Use Cloudinary transformations and `next/image` or optimized Cloudinary URLs.
- Never show original-size images in cards.
- Avoid duplicate analytics/listeners and avoid `onSnapshot` for large collections unless there is a clear need.
- Keep chart libraries/admin analytics admin-only and lazily loaded where practical.
- Use bounded export reads with hard maximum limits.
- Use indexed queries only; do not add broad unindexed admin filters that will fail in production.

## H) Implementation phases

### 1. Backend foundations/env/schema/types

- Add documented env contract, server-only Firebase Admin helper plan, shared schema/types, validators, and Firestore collection constants.
- No real Firebase app wiring until owner creates project/env vars.

### 2. Product data + Firestore read cache

- Introduce product read strategy for active products and product detail by slug.
- Add cache/revalidation policy and indexes.

### 3. Cart localStorage finalization

- Finalize 213 RUN cart item shape, storage key, variant key, quantity caps, and subtotal calculations.

### 4. Quick checkout drawer

- Use RUN 213 drawer UI and cart context. Drawer leads to `/checkout`, not full checkout form inside drawer unless requested.

### 5. Checkout order API

- Implement `POST /api/orders` with server validation, transaction, shipping recalculation, stock decrement, idempotency, and admin stats update.

### 6. Customer orders page

- Implement customer order history/detail and pending-only edit/cancel API behavior.

### 7. Favorites/wishlist

- LocalStorage favorites first; optional Firestore sync for authenticated users.
- Newsletter/wishlist endpoint with rate limit, Turnstile, and dedupe.

### 8. Admin auth/admin shell

- Firebase Auth admin login, custom claim check, protected admin layout, and server guards.

### 9. Admin products + Cloudinary upload

- Product CRUD/soft archive, validation, image signed uploads, Cloudinary metadata storage, and stock management.

### 10. Admin orders/status

- Paginated order list/detail, status changes, return cost, admin notes, CSV export.

### 11. Analytics aggregation

- Write-time admin stats and daily stats. Dashboard reads aggregate docs only.

### 12. Run Club submissions

- Public submission endpoint, Cloudinary pending folder, monthly cap, admin approval/rejection, public approved gallery.

### 13. Security hardening

- Turnstile, durable rate limits, honeypot, logging, Firestore rules, emulator/rules tests, API tamper tests.

### 14. Performance pass

- Pagination review, image transform review, cache/revalidation review, bundle review, admin chart lazy loading.

### 15. Final QA

- End-to-end checkout, customer order edit/cancel, favorites persistence, admin order/product flows, Cloudinary uploads, run club moderation, export, rules, and production env verification.

## I) Firebase setup checklist for the owner

1. **Create Firebase project** for 213 RUN.
2. **Create a Web app** in Firebase project settings.
3. **Copy public web config** into Vercel env vars:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` only if later used
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
4. **Create Firestore database** in production mode.
5. **Enable Firebase Auth** provider(s): email/password first, Google optional later.
6. **Create admin user** in Firebase Auth.
7. **Set admin custom claim** for the admin user using a one-time secure script or Firebase Admin tooling:
   - `{ admin: true }`
8. **Create service account key** or use Vercel-supported secure credentials.
9. **Add server env vars in Vercel:**
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - optional `FIREBASE_ADMIN_EXPORT_TOKEN`
10. **Create Cloudinary account/folder plan** and add:
    - `CLOUDINARY_CLOUD_NAME`
    - `CLOUDINARY_API_KEY`
    - `CLOUDINARY_API_SECRET`
11. **Create Turnstile site** before final launch and add:
    - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
    - `TURNSTILE_SECRET_KEY`
12. **Deploy Firestore rules** after review.
13. **Deploy required Firestore indexes** only for actual 213 RUN queries.
14. **Verify Vercel env separation** between preview and production.
15. **Run production smoke tests** after deploy with a test product and test COD order.

## J) Exact tests per phase

### 1. Backend foundations/env/schema/types

- **Commands:**
  - `npm run lint`
  - `npm run build`
- **Pages to test:** none; documentation/types only.
- **Expected behavior:** build succeeds with no client import of server-only modules.
- **Failure cases:** missing env should produce safe server errors, not crash public UI during static render.

### 2. Product data + Firestore read cache

- **Commands:**
  - `npm run lint`
  - `npm run build`
  - Firebase emulator/read test if configured.
- **Pages to test:** `/shop`, `/product/[slug]`, homepage product sections.
- **Expected behavior:** only `status == "active"` products show publicly; archived/draft products are hidden.
- **Failure cases:** invalid slug returns not found; missing image uses safe placeholder; missing Firebase env shows controlled setup message in development.

### 3. Cart localStorage finalization

- **Commands:**
  - `npm run lint`
  - `npm run build`
  - unit tests for cart reducer/context if test framework exists.
- **Pages to test:** `/shop`, `/product/[slug]`, cart drawer trigger.
- **Expected behavior:** add, merge same variant, update quantity, remove, clear, and persist after refresh.
- **Failure cases:** quantity above max is clamped; invalid quantity is rejected; corrupted localStorage resets safely.

### 4. Quick checkout drawer

- **Commands:**
  - `npm run lint`
  - `npm run build`
- **Pages to test:** `/`, `/shop`, `/product/[slug]`, `/checkout` link from drawer.
- **Expected behavior:** drawer opens/closes, body overlay works, items render with size/color/quantity, subtotal correct, checkout CTA works.
- **Failure cases:** empty cart state displays cleanly; mobile has no horizontal overflow; keyboard escape/close works if implemented.

### 5. Checkout order API

- **Commands:**
  - `npm run lint`
  - `npm run build`
  - API tests against local/emulator Firebase.
- **Pages to test:** `/checkout`, `/order-success/[orderId]`.
- **Expected behavior:** server creates order, recalculates totals, decrements limited stock, stores COD payment method, and clears cart only after success.
- **Failure cases:** fake price rejected; invalid product rejected; inactive product rejected; invalid size/color rejected; invalid wilaya/phone rejected; stock shortage rejected; duplicate idempotency key does not create duplicate order; rate limit returns controlled error.

### 6. Customer orders page

- **Commands:**
  - `npm run lint`
  - `npm run build`
  - API tests for pending/non-pending edit/cancel.
- **Pages to test:** `/orders`, `/orders/[id]`.
- **Expected behavior:** customer sees own orders only; pending order can be edited/cancelled; confirmed/shipped/delivered/cancelled orders cannot be modified.
- **Failure cases:** unauthenticated or non-owner access blocked; invalid order ID blocked; customer cannot update status directly.

### 7. Favorites/wishlist

- **Commands:**
  - `npm run lint`
  - `npm run build`
- **Pages to test:** `/favorites`, `/shop`, `/product/[slug]`, footer/signup form if wired.
- **Expected behavior:** favorites persist locally; authenticated sync merges without duplicates; wishlist dedupes normalized email.
- **Failure cases:** invalid email rejected; rate-limited signup rejected; favorite payload with invalid product ID rejected.

### 8. Admin auth/admin shell

- **Commands:**
  - `npm run lint`
  - `npm run build`
  - manual token/custom-claim verification.
- **Pages to test:** `/admin` and admin login flow.
- **Expected behavior:** only users with `admin` custom claim access admin routes/APIs.
- **Failure cases:** non-admin authenticated user gets 403; unauthenticated user gets 401/redirect; expired token rejected.

### 9. Admin products + Cloudinary upload

- **Commands:**
  - `npm run lint`
  - `npm run build`
  - upload/signature API tests.
- **Pages to test:** `/admin/products`, `/admin/products/[id]`, `/shop`, `/product/[slug]`.
- **Expected behavior:** admin creates/updates/archives product; uploaded images use Cloudinary; active valid products appear publicly.
- **Failure cases:** non-admin cannot sign upload; invalid file type/size rejected; active product without required fields rejected; archived product hidden publicly.

### 10. Admin orders/status

- **Commands:**
  - `npm run lint`
  - `npm run build`
  - API tests for status transitions.
- **Pages to test:** `/admin/orders`, `/admin/orders/[id]`, customer `/orders/[id]`.
- **Expected behavior:** admin can update status; customer modification locks after non-pending status; return cost/profit snapshots update where applicable.
- **Failure cases:** invalid status rejected; non-admin status update rejected; repeated status update does not double-count stats.

### 11. Analytics aggregation

- **Commands:**
  - `npm run lint`
  - `npm run build`
  - aggregation tests with seeded orders.
- **Pages to test:** `/admin` dashboard.
- **Expected behavior:** dashboard reads `adminStats` and `adminStatsDaily`, not full orders collection.
- **Failure cases:** stats remain consistent after cancellation/return; missing daily doc is handled as zero.

### 12. Run Club submissions

- **Commands:**
  - `npm run lint`
  - `npm run build`
  - API tests for Turnstile/rate/cap/moderation.
- **Pages to test:** `/run-club`, admin run club queue when created, homepage approved gallery if wired.
- **Expected behavior:** public submission creates `pending`; admin approval is required for public display; monthly cap closes submissions.
- **Failure cases:** invalid proof rejected; oversized file rejected; repeated IP blocked; rejected submissions never appear publicly.

### 13. Security hardening

- **Commands:**
  - `npm run lint`
  - `npm run build`
  - Firestore emulator rules tests.
  - API abuse/tamper test suite.
- **Pages to test:** checkout, contact, wishlist, run club, admin.
- **Expected behavior:** direct client writes denied; public endpoint abuse blocked; admin APIs require claim; secrets absent from client bundle.
- **Failure cases:** client cannot create order directly in Firestore; fake token rejected; missing Turnstile rejected in production mode.

### 14. Performance pass

- **Commands:**
  - `npm run lint`
  - `npm run build`
  - bundle/analyzer command if configured.
- **Pages to test:** `/`, `/shop`, `/product/[slug]`, `/admin/orders`, `/admin/products`.
- **Expected behavior:** paginated lists, optimized images, bounded reads, no unnecessary real-time listeners.
- **Failure cases:** admin pages do not fetch all documents; card images do not request originals; load-more does not duplicate records.

### 15. Final QA

- **Commands:**
  - `npm run lint`
  - `npm run build`
  - full manual production smoke test.
- **Pages to test:** all public MVP pages and admin MVP pages.
- **Expected behavior:** complete path works from browsing product to COD order, admin confirmation, customer lockout after confirmation, favorites persistence, newsletter signup, run club moderation, and CSV export.
- **Failure cases:** any security, stock, payment, admin, or public visibility issue blocks launch.

## Fish Your Style audit notes by requested area

1. **Cart and quick checkout drawer logic:** reuse localStorage cart provider, variant key merge, quantity clamp, and subtotal ideas. Redesign drawer UI fully for 213 RUN.
2. **Checkout/order creation flow:** reuse server Route Handler, payload normalization, Algeria phone/wilaya concepts, Firestore transaction, stock decrement, and admin stats update. Strengthen with idempotency and Turnstile.
3. **Client orders page:** reuse owner/admin read concept and pending-only mutation pattern. Avoid exposing financial/admin fields to customers.
4. **Favorites/wishlist logic:** reuse localStorage-first favorite concept and optional Firestore sync. Keep wishlist as rate-limited, deduped email signup.
5. **Admin products dashboard:** reuse product CRUD concepts, pagination, validation, stock fields, and image metadata. Replace old taxonomy and UI.
6. **Admin orders dashboard:** reuse paginated recent orders, status updates via protected API, status badges concept, and export concept. Replace UI.
7. **Admin overview/analytics aggregation:** reuse aggregate docs/daily stats concept. Replace category palette and old metrics with 213 RUN categories.
8. **Cloudinary upload flow:** reuse delivery URL transformation only. Replace direct unsigned upload with signed admin route and community caps.
9. **Firebase/Firestore data model:** reuse products/orders/favorites/adminStats/adminStatsDaily/contact/wishlist concepts, adapted to 213 RUN names and fields.
10. **Firebase Admin SDK usage:** reuse server-side resource initializer, token verification, custom claim admin checks, and guarded admin helpers.
11. **Firestore rules:** reuse baseline structure but make `status == "active"` mandatory for public product reads and add catch-all deny.
12. **Security/rate limiting/abuse protection:** reuse helper concepts; upgrade production rate limiting to durable storage and add Turnstile.
13. **Google Sheets export if present:** reference repo includes CSV/order export concepts and a `Code.gs` automation file. For 213 RUN, keep export as bounded CSV first; Sheets automation is optional later.
14. **Caching/performance patterns:** reuse pagination and aggregate stats; avoid unbounded admin reads and duplicate listeners.
15. **Environment variables:** split public Firebase client config from server-only Admin, Cloudinary, Turnstile, and export secrets.
16. **Known weaknesses to avoid:** old UI/branding, direct/unsigned upload flow, in-memory-only rate limits for production, public product reads that allow missing status, trusting client order fields, legacy categories/design themes, and unbounded dashboard/export queries.
