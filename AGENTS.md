# 213 RUN — AGENTS.md / Brand + UI/UX + Technical Migration PRD

**Recommended filename:** `AGENTS.md`  
**Optional duplicate:** `CLAUDE.md` only if Claude is still used.  
**Project:** 213 RUN  
**Current priority:** UI/UX first, backend migration after the approved pages are stable.  
**Technical reference:** Fish Your Style codebase only for proven commerce/backend/admin logic. Do **not** copy Fish Your Style UI/UX, blue theme, assets, product names, old categories, or clutter.

---

## 0. How every AI agent must use this document

This file is the project constitution. Every Codex/Cursor/Claude session must start by reading this file.

Every coding prompt must start with:

```text
Read AGENTS.md carefully before writing code.
Use the approved 213 RUN UI as the source of truth.
Do not redesign the website.
Only modify the requested task.
Do not touch unrelated sections.
Do not commit unless I explicitly ask.
```

Critical rule:

```text
The approved UI/UX is the source of truth.
If the task is small, do not regenerate or redesign the whole page.
Only change the exact requested part.
```

When auditing Fish Your Style:

```text
Do not rely on old AGENTS.md, CLAUDE.md, README, or docs as truth.
The actual codebase files are the source of truth.
Fish Your Style is a reference for logic only, not design.
```

---

## 1. Final build strategy

The correct strategy is:

```text
RUN 213 = clean new frontend + migrated proven Fish Your Style backend/admin logic.
```

Do **not** copy the whole Fish Your Style repo into RUN 213.

Do **not** copy:

- Fish Your Style blue UI
- Fish Your Style logo/assets
- Fish Your Style homepage
- Fish Your Style old product names
- Fish Your Style old categories such as ensembles/design themes unless explicitly needed
- unused components
- legacy placeholders
- heavy animations
- direct unsafe Cloudinary unsigned upload flow
- any direct client order write pattern

Do reuse or rewrite from Fish Your Style:

- cart localStorage/state logic
- favorites localStorage + optional Firestore sync logic
- checkout flow concepts
- COD/wilaya/shipping logic if Algeria COD remains
- server-side order creation API architecture
- Firestore transaction pattern
- stock decrement logic
- pending-only customer edit/cancel logic
- admin products/orders concepts
- Firebase Admin helper/custom claim admin model
- Firestore rules baseline
- Firestore indexes subset
- Cloudinary delivery URL transformer
- contact/wishlist API validation concepts
- CSV/export logic later
- analytics event concepts later

---

## 2. Phase priority — UI first, logic second

The current priority is not backend migration yet. The current priority is to build the approved UI/UX pages first.

Why:

```text
A visitor must first see the brand, understand the products, add to cart, and feel trust.
The backend can be migrated after the visual structure and pages are approved.
```

Do not start with admin dashboard or Firebase before the core public UI is stable.

### Current correct order

```text
Phase 1 — UI/UX foundation and public pages
Phase 2 — Client commerce state: cart/favorites localStorage
Phase 3 — Cart drawer + checkout UI
Phase 4 — Backend migration: Firebase/order API/rules
Phase 5 — Customer orders/edit/cancel
Phase 6 — Admin dashboard/products/orders
Phase 7 — Cloudinary signed upload + community approval
Phase 8 — Security hardening/rate limits/Turnstile
Phase 9 — Analytics/SEO/launch polish
```

---

## 3. Brand identity

**Brand:** 213 RUN  
**Type:** running lifestyle / active streetwear ecommerce  
**Market:** Algeria, beginner runners, everyday active people, fitness lifestyle buyers, active streetwear buyers  
**Positioning:** active streetwear with running culture, not elite pro racewear.

213 RUN is not a purely technical sport brand. It is a movement brand built around discipline, running, and daily consistency.

Use positioning like:

```text
Running lifestyle
Everyday movement
Active streetwear
After-run comfort
Built for every run
Made to move with you
Made on demand
```

Avoid overclaims like:

```text
Professional marathon performance gear
Elite race technology
Scientific speed gear
Guaranteed speed improvement
```

---

## 4. Brand philosophy

Main slogan:

```text
BUILT.
NOT FOUND.
```

Meaning:

```text
You do not find yourself.
You build yourself.
One run at a time.
```

Brand tone:

- short
- minimal
- confident
- direct
- disciplined
- beginner-friendly
- clean
- not cliché
- not over-explained

Approved phrases:

```text
BUILT. NOT FOUND.
RUN YOUR PACE.
ONE MORE KILOMETER.
DISCIPLINE OVER MOTIVATION.
EVERY STEP BUILDS YOU.
NO SHORTCUTS.
SEE YOU TOMORROW.
NO NEED TO BE FAST.
NO NEED TO RUN FAR.
JUST SHOW UP.
```

Avoid generic motivational copy:

```text
Believe in yourself!
Never stop dreaming!
Become the best version of yourself!
```

---

## 5. Visual direction

The approved visual direction is:

```text
Premium minimal ecommerce
Off-white / cream light mode
Charcoal / black dark mode
Lime accent
Bold condensed typography
Cinematic road/mountain/nature imagery
Active streetwear product cards
Clean figures + lifestyle cards for Shop The Look
```

The website should feel:

- clean
- premium
- energetic
- outdoor/nature/city mix
- not too dark in light mode
- not generic sport template
- not blue
- not Fish Your Style

### Color ratio

Use approximately:

```text
70% off-white / black base
20% product/lifestyle imagery
10% lime accent
```

### Accent usage

Lime is for:

- main CTAs
- arrows
- active tabs
- small labels
- cart badges
- selected states
- small underline accents

Do not flood the UI with lime.

---

## 6. Color system

### Shared accent

```css
--accent: #c7f400;
--accent-strong: #b6f000;
```

### Light mode tokens

```css
--bg: #f5f1e8;
--surface: #fbf8f0;
--surface-soft: #eee8dc;
--text: #050505;
--muted: #5f5f5f;
--border: rgba(0, 0, 0, 0.10);
--accent: #c7f400;
```

### Dark mode tokens

```css
--bg: #070807;
--surface: #111211;
--surface-soft: #181a18;
--text: #f4f4f0;
--muted: #b5b5ae;
--border: rgba(255, 255, 255, 0.10);
--accent: #c7f400;
```

Dark mode must be the same exact layout as light mode. Only theme variables change.

---

## 7. Logo rules

Use the official 213 RUN logo provided by the user.

Rules:

- keep correct aspect ratio
- do not stretch
- do not redraw
- do not invent a new logo
- do not replace it with text-only 213 unless asked
- header logo must stay top-left
- footer logo must use the official mark
- favicon can use a simplified mark if needed

If the logo is placed on dark backgrounds, use a readable white/lime version. If only one logo asset exists, apply it carefully without distortion.

---

## 8. Products for V1

### Main Drop_001 / Summer Build

```text
Oversized Tee
Regular Tee
Wide Short
Regular Short if available
Open Leg Pant
Baggy Jogger
```

### Promo / Layers

```text
Zip Hoodie
Sweatshirt
High Neck Zip Shirt
Hat / Neck Warmer Regular
Winter Hat
Backpack
```

### Future possible products

```text
Tote Bag
More accessories
Winter drop pieces
```

Do not add in V1 unless the user approves:

```text
Shoes
Socks
Bottle
Cap
Random gym equipment
```

---

## 9. Product categories

For the website navigation and shop filters, use broad categories:

```text
All Products
T-Shirts
Pants
Hoodies
Accessories
```

Internal category slugs:

```ts
type ProductCategory = "tshirts" | "pants" | "hoodies" | "accessories";
```

Category meaning:

```text
T-Shirts: oversized tee, regular tee
Pants: wide short, regular short, open leg pant, baggy jogger
Hoodies: zip hoodie, hoodie, sweatshirt, high neck zip shirt if treated as layer
Accessories: backpack, tote bag, Hat / Neck Warmer Regular, Winter Hat
```

Use `Tops` only for visual category cards on the homepage if it feels better visually. For shop tabs, use the product categories above.

---

## 10. Homepage final UI/UX source of truth

The approved homepage structure is:

```text
Header
Hero
01 DROP_001
02 Shop By Category
03 Shop The Look
04 Promo Picks
05 213 RUN Club
06 Brand Philosophy + Footer
```

Do not add sections without asking.
Do not remove sections without asking.
Do not redesign the homepage when changing one section.

---

## 11. Header

### Layout

- logo left
- navigation center
- icons right

Navigation:

```text
SHOP
DROP_001
RUN CLUB
ABOUT
```

Icons:

```text
search
heart / favorites
cart
menu
```

### Light mode

- transparent/off-white background
- black nav text
- black icons
- lime cart badge

### Dark mode

- transparent or charcoal background
- off-white nav text
- off-white icons
- lime cart badge

---

## 12. Hero section

### Visual

- runner on the right side
- mountain road / sunset / road
- left side clean for text
- strong cinematic energy
- no random sea transition unless intentionally used later in video

### Hero text

```text
213 RUN

BUILT.
NOT FOUND.

Running lifestyle for the ones who show up.
```

### CTAs

Primary:

```text
SHOP DROP_001 →
```

Secondary:

```text
EXPLORE LOOKS →
```

### Light hero

- black headline
- charcoal body
- lime primary button
- transparent bordered secondary button
- left-to-right white/cream fade over image for readability

### Dark hero

- off-white headline
- soft gray body
- lime primary button
- transparent bordered secondary button
- dark gradient over image for readability

---

## 13. DROP_001 homepage section

Purpose: main sales section.

Left copy:

```text
01
DROP_001

First drop ever.
Built for every run.
Made to move with you.

VIEW ALL PRODUCTS →
```

Product row:

```text
Oversized Tee
Regular Tee
Wide Short
Open Leg Pant
Baggy Jogger
```

Product card requirements:

- product image
- heart icon
- product name
- price
- lime arrow
- minimal card background
- no blue

---

## 14. Shop By Category homepage section

Purpose: quick navigation by category.

Left copy:

```text
02
SHOP BY CATEGORY

Shop the essentials.
Built for your run.
```

Cards:

```text
TOPS
BOTTOMS
ACCESSORIES
```

Cards must use lifestyle images and dark overlay for text readability.

---

## 15. Shop The Look homepage section

This section has two parts.

### Part A — Figure selector row

Four PNG/cutout model figures:

```text
01 SUMMER ROAD
02 CITY EVERYDAY
03 EVENING LAYER
04 ESSENTIAL LAYERS
```

Interaction rule:

```text
Active figure:
- opacity 100%
- scale around 1.05
- clean lime label/number highlight
- optional subtle glow only

Inactive figures:
- opacity around 0.6–0.7
- still clearly visible
- still clickable
- no blur
- no display:none
- do not disappear
```

Important:

- Do not use a big yellow/lime circle behind the active model.
- Use clean highlight only.
- Do not add an active detail row on the homepage.
- Do not hide the inactive looks.

### Part B — Look cards row

Cards:

```text
SUMMER ROAD
Light. Fast. Unstoppable.

CITY EVERYDAY
Movement in every moment.

EVENING LAYER
Adapt. Reflect. Keep going.

ESSENTIAL LAYERS
Built for every condition.
```

Each card:

- lifestyle photo
- dark overlay
- white text
- lime arrow
- clickable to future look detail/drawer/page

---

## 16. Promo Picks homepage section

Left copy:

```text
04
PROMO PICKS

Selected pieces.
Limited time promo.

VIEW ALL →
```

Products:

```text
Zip Hoodie
Sweatshirt
High Neck Zip Shirt
Hat / Neck Warmer Regular
Winter Hat
Backpack
```

Card requirements:

- promo badge
- current price
- old price struck-through if available
- discount badge if available
- heart icon
- lime arrow

Product name must be:

```text
Hat / Neck Warmer Regular
```

not just `Neck Warmer`.

---

## 17. 213 RUN Club homepage section

Purpose: community proof and future submission funnel.

Final layout:

Left block:

```text
05
213 RUN CLUB

Share your run.
Build your streak.
One month. One winner.

SUBMIT YOUR RUN →
#213RUNCLUB   Instagram icon
```

Visuals center/right:

1. runner proof photo
2. phone route screenshot
3. group/community photo
4. mountain road / route photo

Phrases under photos, centered:

```text
NO NEED TO BE FAST.
NO NEED TO RUN FAR.
JUST SHOW UP.
```

Rules:

- `#213RUNCLUB` goes under the Submit Your Run button on the left.
- the 3 phrases go under the photos, centered.
- do not place the phrases as a separated right sidebar.
- mobile stacks: text → button/hash → images → phrases.

---

## 18. Footer / Brand Philosophy

Brand philosophy is part of the footer area.

Text:

```text
06
BRAND PHILOSOPHY

You don’t find yourself.
You build yourself.

BUILT.
NOT FOUND.
```

Footer columns:

```text
SHOP
All Products
T-Shirts
Shorts
Pants
Hoodies
Accessories

DROP_001
Overview
Tops
Bottoms
Accessories

INFO
Run Club
About Us
Shipping
Returns
FAQ

FOLLOW US
Instagram
TikTok
YouTube
Strava

JOIN THE CLUB
Get early access to new drops
and exclusive offers.

Enter your email →
```

### Footer background

Use a wide mountain/road background image behind the footer.

Light mode:

- keep background visible but clear/brighter
- not too dark
- cream/white overlay
- black/charcoal text
- readable newsletter input

Dark mode:

- same background image
- black overlay
- off-white text
- readable newsletter input

Example CSS concept:

```css
.footerLight {
  background-image:
    linear-gradient(rgba(245,241,232,0.70), rgba(245,241,232,0.78)),
    url('/footer-mountain-road.webp');
}

.footerDark {
  background-image:
    linear-gradient(rgba(0,0,0,0.68), rgba(0,0,0,0.75)),
    url('/footer-mountain-road.webp');
}
```

---

## 19. Shop page UI/UX

The approved shop page direction:

```text
Header
Shop hero/banner
Search bar at the top
Category tabs at the top
Product grid
Load more / pagination
Footer
```

Do **not** use a left sidebar filter in V1.

### Shop hero

Copy:

```text
SHOP / All Products
Built for every run.
```

Visual:

- light mountain road / runner banner
- search bar integrated to top/right area
- clean off-white background

### Search bar

- placed top area
- full width on mobile
- placeholder:

```text
Search products...
```

### Category tabs

```text
ALL PRODUCTS
T-SHIRTS
PANTS
HOODIES
ACCESSORIES
```

On mobile: horizontal scroll tabs.

### Product grid

Desktop:

```text
4–5 columns depending width
```

Mobile:

```text
2 columns
```

Product card must show:

- image
- heart icon
- name
- price
- small color circles
- size chips
- optional promo badge

For accessories with no sizes, show only color circles.

---

## 20. Product detail page UI/UX

Route:

```text
/product/[slug]
```

Desktop layout:

Left:

- large product image
- thumbnails

Right:

- category/drop label
- product name
- price
- color picker
- size picker
- size guide link
- product details
- stock status
- add to cart button
- favorite button
- delivery/returns note

Mobile:

- image first
- sticky add-to-cart bottom optional
- selectors below image
- details accordion optional

Product details examples:

```text
100% cotton premium
Oversized fit
Unisex
190 GSM
Comfort all day
Made to move with you
```

---

## 21. Cart drawer UI/UX

Use Fish Your Style cart logic concept, but RUN 213 design.

Desktop:

- drawer opens from right
- dark overlay behind page
- width around 380–440px

Mobile:

- full-screen drawer or bottom-sheet style

Cart item:

- image
- product name
- size/color
- quantity controls
- price
- remove

Footer:

```text
Subtotal
Shipping calculated at checkout
Payment: Cash on delivery
GO TO CHECKOUT →
```

Do not put the whole checkout form inside the drawer for V1 unless requested. Prefer cart drawer → checkout page.

---

## 22. Checkout page UI/UX

Route:

```text
/checkout
```

Layout:

Left card:

```text
Delivery details
Full name
Phone
Wilaya
Delivery mode
Address
Notes
Confirm order
```

Right card:

```text
Order summary
Items
Subtotal
Shipping
Total
Payment method: Cash on delivery
```

Rules:

- COD only in V1
- Algeria delivery fields
- server must recalculate shipping later
- no client direct order writes
- all order creation through `/api/orders`

---

## 23. Customer order pages UI/UX

Routes:

```text
/orders
/orders/[id]
```

### Orders page

Shows customer order cards:

- order ID
- status badge
- date
- total
- items preview
- customer/shipping summary
- view details button

### Order details page

Before admin confirmation (`pending`):

- customer can edit shipping/contact info
- customer can cancel order

After confirmation or later:

```text
This order can no longer be modified.
```

Rules:

- customer can edit/cancel only while `status === "pending"`
- after `confirmed`, `shipped`, `delivered`, `cancelled`, no customer edits
- server API must enforce this, not only UI

---

## 24. Favorites page UI/UX

Route:

```text
/favorites
```

V1 behavior:

- localStorage favorites first
- no login required
- later can sync to Firestore when auth exists

Page shows:

- favorite products grid/list
- remove favorite
- view product
- add to cart

Empty state:

```text
No favorites yet.
Save products you like and come back later.
```

---

## 25. Run Club page UI/UX

Route:

```text
/run-club
```

V1 content:

- hero explaining 213 RUN Club
- submit run CTA
- rules
- monthly giveaway explanation
- approved community gallery

Submission form later:

```text
Name
Instagram optional
Distance
Time optional
Run app screenshot/photo upload
Short note optional
```

All submissions must go to pending review, not public immediately.

---

## 26. About page UI/UX

Route:

```text
/about
```

Keep it short.

Content:

- 213 RUN story
- Built. Not Found.
- Made for beginners and disciplined people
- Algeria identity
- brand philosophy

Avoid long paragraphs.

---

## 27. Contact page UI/UX

Route:

```text
/contact
```

Content:

- contact form
- Instagram/TikTok links
- support note
- FAQ mini block

Later backend:

- form posts to `/api/contact`
- rate limit
- honeypot
- optional Turnstile
- admin contact inbox

---

## 28. Admin dashboard UI/UX

Admin is after public commerce UI.

Routes:

```text
/admin
/admin/orders
/admin/orders/[id]
/admin/products
/admin/products/[id]
/admin/favorites
/admin/wishlist
/admin/contact
/admin/settings
```

Visual style:

- dark charcoal admin theme
- lime accents
- RUN 213 logo
- no blue Fish Your Style theme
- left sidebar
- cards
- tables
- filters/search
- status badges

Admin pages:

```text
Overview: stats/cards/charts
Orders: list, filters, statuses, CSV export
Order details: status updates, customer/shipping/items/profit
Products: create/edit/archive, stock, sizes/colors/images
Favorites: top saved products
Wishlist: email signups
Contact: messages
Settings: future homepage/shop config
```

Admin protection:

- custom claim admin
- server/API guard
- not only UI hiding

---

## 29. Technical page list for V1

Public MVP:

```text
/
/shop
/product/[slug]
/favorites
/checkout
/order-success/[orderId]
/orders
/orders/[id]
/run-club
/about
/contact
```

Optional later:

```text
/cart
/look/[slug]
/wishlist
/faq
/shipping
/returns
/privacy
/terms
```

Admin MVP:

```text
/admin
/admin/orders
/admin/orders/[id]
/admin/products
/admin/products/[id]
/admin/favorites
/admin/wishlist
/admin/contact
```

---

## 30. Fish Your Style migration map

The Fish Your Style audit confirmed these useful source concepts.

### Strong reuse candidates

```text
src/context/cart.tsx
src/hooks/use-favorites.tsx
src/app/api/orders/route.ts
src/app/api/orders/[orderId]/route.ts
src/app/api/favorites/route.ts
src/app/api/contact/route.ts
src/app/api/wishlist/route.ts
src/lib/firebaseAdmin.ts
src/lib/firebaseClient.ts
src/lib/firebaseConfig.ts
src/lib/apiProtection.ts
src/lib/stock.ts
src/lib/algeriaPhone.ts
src/data/shipping.ts
src/data/algeriaWilayas.ts
src/lib/cloudinary.ts delivery transform only
src/app/api/admin/orders-export/route.ts
firestore.rules baseline
firestore.indexes.json subset
```

### Rewrite visually

```text
cart drawer UI
checkout UI
favorites page UI
orders pages UI
admin shell UI
admin products UI
admin orders UI
product cards UI
navbar/footer/homepage
```

### Skip

```text
Fish public assets
Fish blue theme
Fish hero/navbar/footer
Fish categories/design theme defaults
legacy CheckoutForm placeholder
old docs as source of truth
old product data
old legal/FAQ text
```

---

## 31. Backend and database collections

Planned collections:

```text
products
orders
users
favorites
wishlistSignups
contactMessages
communitySubmissions
adminStats
adminStatsDaily
settings
```

### Product schema concept

```ts
type Run213Product = {
  id: string;
  slug: string;
  name: string;
  description?: string;
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
  createdAt?: string;
  updatedAt?: string;
};
```

### Order schema concept

```ts
type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";
```

Order rules:

- created through server API only
- server recalculates product prices
- server recalculates shipping
- server validates size/color variants
- server checks and decrements stock transactionally
- customers can edit/cancel only while pending

---

## 32. Firebase rules strategy

Base rules:

- public can read only active products
- public cannot directly create orders
- orders are created by server Admin SDK
- customers can read own orders only
- customers cannot update orders directly unless a safe API handles pending edits
- admin can read/write admin collections
- contact/wishlist/community submissions go through API
- community public only sees approved submissions

Add explicit catch-all deny.

Do not allow products missing status to be public in RUN 213. Require:

```text
status == "active"
```

---

## 33. Firestore indexes strategy

Likely indexes:

```text
orders: userId ASC, createdAt DESC
orders: customerEmailNormalized ASC, createdAt DESC
orders: status ASC, createdAt DESC
products: status ASC, category ASC, createdAt DESC
products: status ASC, featured ASC, sortOrder ASC
products: slug ASC, status ASC
communitySubmissions: status ASC, createdAt DESC
adminStatsDaily: date ASC if using field date
```

Do not copy old Fish indexes blindly. Keep only indexes needed by actual RUN 213 queries.

---

## 34. Cloudinary and media strategy

Use Cloudinary for:

- product images
- hero video/poster
- footer background
- run club photos
- community proof uploads later

Firestore stores only metadata/URLs, never raw images.

### Image transformations

Use transformed URLs:

```text
cards: w_480, f_auto, q_auto
product detail: w_1200, f_auto, q_auto
thumbs: w_180, f_auto, q_auto
original: only for admin/download if needed
```

### Upload rules

Do not keep Fish Your Style direct unsigned browser upload as-is.

RUN 213 should use:

```text
/api/upload
admin-only signed upload
allowed formats: jpg, jpeg, png, webp, avif if supported
max file size: 5–10MB for admin product images
folder separation: run213/products, run213/community-pending, run213/brand
```

Community uploads:

- strict limit
- Turnstile
- pending approval
- no immediate public display
- monthly cap if needed

---

## 35. Security requirements

Required before launch:

### Admin auth

```text
Firebase custom claims + server admin guard
```

Do not rely only on UI hiding.

### Public API protection

Protect:

```text
/api/orders
/api/contact
/api/wishlist
/api/community
/api/upload
```

Use:

- rate limiting
- honeypot
- server validation
- optional Turnstile
- generic error messages

### Order security

Server must:

- ignore client price as source of truth
- read products from Firestore
- verify product status active
- verify variant size/color exists
- verify stock
- recalculate shipping
- create order in transaction
- decrement stock in transaction
- use idempotency key to reduce duplicate orders

### Cloudinary security

- no open unlimited unsigned uploads
- server signed upload route
- file size limits
- file format limits
- delete/cleanup old images if possible

---

## 36. Rate limits

V1 target limits:

```text
/api/orders: 5 per hour per IP for guests, 10 per hour for authenticated users
/api/contact: 3 per 10 minutes per IP
/api/wishlist: 3 per hour per IP + email dedupe
/api/community: 1–2 per hour per IP + Turnstile
/api/upload: admin-only + 30 per hour per admin
/api/favorites: localStorage first; API later 60 per hour authenticated
```

Fish Your Style used in-memory limits. RUN 213 can start with simple protection during development, but production should later use durable storage such as Upstash/Vercel KV/Redis/Firestore TTL.

---

## 37. Community feature — safe V1

Run Club submission must not be public instantly.

Submission flow:

```text
User submits run proof → API validates → Cloudinary pending folder → Firestore communitySubmissions status pending → Admin approves → appears publicly
```

Accepted proof:

- screenshot from Strava/Google Fit/any run app
- photo with run proof
- optional runner photo

Do not store unlimited submissions.

Suggested monthly cap:

```text
Open submissions until 26–50 valid pending submissions per month.
After cap: show “submissions closed for this month”.
```

This protects Cloudinary and Firebase free-tier limits.

---

## 38. Performance and cost rules

- use Cloudinary transformed URLs
- never show original image in cards
- product grid should load limited items first
- shop: initial 8–12 products, then load more
- community: show max 3–6 approved cards on homepage
- admin tables must paginate
- avoid onSnapshot for large collections
- aggregate stats at write time
- keep Recharts/admin charts admin-only
- avoid heavy animations in homepage
- respect prefers-reduced-motion

---

## 39. Analytics and SEO

Analytics comes later after ecommerce flow is stable.

Later reuse concepts from Fish Your Style:

```text
GA4 view_item
add_to_cart
begin_checkout
purchase
Meta Pixel PageView
AddToCart
InitiateCheckout
Purchase
purchase dedupe by orderId
```

SEO V1:

- metadata
- OpenGraph
- product page metadata
- sitemap
- robots
- canonical URLs

---

## 40. Final sprint plan

### Sprint 0 — Documentation and repo safety

Goal:

- AGENTS.md final
- verify repo is RUN 213
- no Fish full copy
- confirm assets/logo/video folders

Tests:

```bash
git status
npm run lint
npm run build
```

---

### Sprint 1 — UI Foundation

Goal:

- design tokens
- layout shell
- header/footer components
- responsive container system
- theme variables light/dark
- no backend
- no Firebase

Output:

```text
Header component
Footer component
Theme tokens
Basic layout wrappers
```

---

### Sprint 2 — Homepage UI

Goal:

Build approved homepage exactly:

```text
Hero
DROP_001
Shop By Category
Shop The Look figures + cards
Promo Picks
213 RUN Club
Brand Philosophy + Footer
```

Rules:

- use placeholder/static product data first
- no backend
- do not wire real orders
- mobile responsive
- light mode first
- dark mode using same layout

---

### Sprint 3 — Shop Page UI

Goal:

Build `/shop` UI:

- shop hero/banner
- search bar top
- category tabs top
- product grid
- product cards with colors/sizes
- load more/pagination placeholder
- light/dark support

No backend yet. Use static/mock product data.

---

### Sprint 4 — Product Detail UI

Goal:

Build `/product/[slug]` UI using mock/static product data:

- gallery
- info panel
- color/size selectors
- size guide
- add to cart visual state
- related products

No backend yet unless cart state already exists.

---

### Sprint 5 — Client Commerce State

Goal:

- product types
- cart localStorage state
- favorites localStorage state
- money formatter
- wire Add to Cart buttons
- wire heart buttons

No Firebase yet.

---

### Sprint 6 — Cart Drawer + Checkout UI

Goal:

- cart drawer UI
- checkout page UI
- local cart summary
- validation UI
- no real order creation yet or mock submit only

---

### Sprint 7 — Backend Migration

Goal:

Migrate from Fish Your Style logic:

- Firebase client/admin config
- product reads
- order API
- Firestore transaction
- pending-only edit/cancel
- Firestore rules/indexes

Add improvements:

- server shipping recalculation
- idempotency key
- variant validation
- stronger rate limit plan

---

### Sprint 8 — Customer Orders + Favorites Page

Goal:

- `/orders`
- `/orders/[id]`
- pending edit/cancel
- `/favorites`
- optional auth sync later

---

### Sprint 9 — Admin Dashboard

Goal:

- admin auth
- overview
- orders
- products
- favorites
- wishlist
- contact
- RUN 213 dark admin theme

---

### Sprint 10 — Cloudinary + Community

Goal:

- signed admin uploads
- transformed URLs
- run club submission API
- community pending approval
- admin approval queue

---

### Sprint 11 — Security hardening

Goal:

- rate limits
- Turnstile where needed
- Firestore emulator tests
- order tamper tests
- upload abuse tests

---

### Sprint 12 — SEO/analytics/launch polish

Goal:

- sitemap/robots
- product metadata
- OG images
- GA4/Meta Pixel if needed
- Vercel/Firebase/Cloudinary cost checks

---

## 41. Current immediate plan for Codex

Because the user wants UI/UX first, the next coding prompts should be:

```text
Sprint 1 — UI Foundation
Sprint 2 — Homepage UI
Sprint 3 — Shop Page UI
Sprint 4 — Product Detail UI
```

Do not start backend migration until these pages are visually stable.

---

## 42. Testing checklist

Always run:

```bash
npm run lint
npm run build
```

For UI pages:

- desktop width
- mobile width
- no horizontal overflow
- images crop correctly
- logo aspect ratio correct
- buttons visible
- text readable
- light mode correct
- dark mode same layout
- no unrelated section changed

For commerce later:

- add to cart
- update quantity
- remove item
- persist after refresh
- favorite persists after refresh
- checkout validation
- fake price rejected server-side
- stock decrement works
- customer edit/cancel only pending
- admin protected

---

## 43. What AI agents must never do

Never:

- redesign approved UI without request
- change whole homepage for one small change
- copy Fish Your Style UI
- copy Fish blue theme
- copy old Fish categories blindly
- add products user did not approve
- add backend before planned sprint
- add Firebase randomly
- add Cloudinary unsigned upload as final solution
- use `any`
- commit automatically
- change logo aspect ratio
- hide Shop The Look inactive figures completely
- put community submissions public without admin approval
- trust client prices in order API
- trust client shipping in order API

---

## 44. Standard prompt prefix

Use this in every Codex prompt:

```text
Read AGENTS.md carefully.
Use the approved 213 RUN UI as source of truth.
Do not redesign anything outside the requested task.
Do not copy Fish Your Style UI.
Do not commit unless I ask.
Run npm run lint and npm run build.
```
