# 213 RUN — Agent Constitution / Brand + Technical PRD

**Recommended filename:** `AGENTS.md`  
**Optional duplicate:** keep a copy as `CLAUDE.md` if you still use Claude.  
**Project:** 213 RUN  
**Status:** Updated after brand, UI/UX, product, community, Cloudinary, and security decisions.

---

## 0. How to use this document

This document is the single source of truth for AI agents, Codex, Claude, Cursor, and future developers.

Every new AI coding session must start with:

> Read `AGENTS.md` carefully before writing code.  
> We are working on Sprint X.  
> The task is Y.  
> Confirm the rules before implementation.

Do not let any AI redesign the brand, change the logo system, add extra pages, or expand scope without explicit permission.

---

## 1. Project identity

**Brand name:** 213 RUN  
**Type:** Premium running lifestyle / active streetwear e-commerce brand  
**Market:** Algerian runners, beginners, fitness people, and active streetwear buyers  
**Core idea:** Clothing + discipline + running culture + community  
**Technical base:** reuse stable logic from Fish Your Style, but do not copy its visual design.

### Brand philosophy

213 RUN is not just a clothing store.

213 RUN is for people who build themselves through discipline, movement, and consistency.

Main slogan:

```text
BUILT.
NOT FOUND.
```

Meaning:

You do not find yourself.  
You build yourself.  
One run at a time.

### Brand tone

- Short
- Minimal
- Confident
- Direct
- Not salesy
- Not motivational cliché
- Beginner-friendly
- Clean and disciplined

Use phrases like:

```text
BUILT. NOT FOUND.
RUN YOUR PACE.
ONE MORE KILOMETER.
DISCIPLINE OVER MOTIVATION.
EVERY STEP BUILDS YOU.
NO SHORTCUTS.
SEE YOU TOMORROW.
```

Avoid:

```text
Believe in yourself!
Never stop dreaming!
Become the best version of yourself!
Gaming/cyberpunk language
Long hype copy
```

---

## 2. Important naming rule

The old file was called `CLAUDE.md`.

For the new project, prefer:

```text
AGENTS.md
```

Reason:

- It is not tied to one AI tool.
- It works as a general project constitution.
- Claude, Codex, Cursor, and future AI sessions can all use it.

For now, it is acceptable to keep both:

```text
AGENTS.md
CLAUDE.md
```

Both can contain the same content until the project is stable.

---

## 3. Visual direction

213 RUN must not look like a gaming, racing, cyberpunk, or neon tech website.

The website should feel like:

- premium running streetwear
- clean e-commerce
- active outdoor energy
- natural light
- editorial fashion layout
- product-focused
- smooth but not heavy

### Color ratio

Use:

```text
75% light / off-white / bone white
20% black / charcoal
5% lime accent
```

The site should not be mostly dark.

### Color usage

Use lime only for:

- CTA buttons
- hover states
- small active lines
- small motion details
- product badges
- active navigation states

Do not use lime as a large background color.  
Do not make the page neon-heavy.

### Logo contrast rules

For dark backgrounds:

```text
Use white + lime logo.
```

For light backgrounds:

```text
Use black + lime logo.
```

For embroidery / labels / favicon:

```text
Use monochrome black or monochrome white where needed.
```

---

## 4. Logo system

213 RUN has two official logo roles.

### 4.1 Brand Mark

This is the `213` icon only.

Use it for:

- Instagram profile
- TikTok profile
- favicon
- app icon
- website loader
- watermark
- small product badge
- product label
- sleeve embroidery
- community cards
- small stickers

This is the recognizable symbol of the brand.

### 4.2 Primary Logo

This is the full logo:

```text
213
RUN
```

Use it for:

- hero section
- website header when space allows
- footer
- packaging
- posters
- product tags
- campaign visuals
- launch graphics
- ads

### 4.3 Logo rule

Do not redraw or reinvent the logo using AI.  
Use the provided original assets.

If a mockup needs the logo, place the original PNG/SVG asset manually in code/Figma/Canva, not through image generation.

---

## 5. Product categories

Only use products that are actually planned.

Current product categories:

```text
Regular Tee
Oversized Tee
Regular Hoodie
Oversized Hoodie
Baggy Open Leg
Baggy Oversized Jogging
```

Do not add caps, bottles, bags, or products that are not currently planned.

---

## 6. Drop system

Do not launch with too many products.

V1 should focus on:

```text
DROP_001
```

Possible Drop 001 design concepts:

```text
BUILT.
NOT FOUND.

RUN YOUR PACE.

ONE MORE KILOMETER.

DISCIPLINE
OVER
MOTIVATION.

EVERY STEP
BUILDS YOU.
```

Each product should feel like part of a collection, not just a random shirt.

Use product names like:

```text
DROP_001 — Built Tee
DROP_001 — Run Your Pace Tee
DROP_001 — One More Kilometer Tee
DROP_001 — Discipline Hoodie
DROP_001 — Every Step Tee
```

---

## 7. Homepage structure

The homepage must be product-focused but still communicate the movement.

Final section order:

```text
1. Hero Video
2. Drop_001
3. Shop By Category
4. Shop The Look
5. 213 RUN Club
6. Brand Philosophy
7. Footer
```

Do not add full blog, journal, Strava page, leaderboard, runner profiles, or heavy community system in V1.

---

## 8. Hero section

The hero should use a short cinematic video background.

### Hero video direction

- runner jogging slowly
- outdoor road / mountain road / seaside / urban morning
- natural light
- active, clean, energetic mood
- runner positioned on the right side
- left side must remain clean for website text
- no cyberpunk
- no gaming
- no heavy neon
- 6 to 8 seconds
- muted
- autoplay
- loop
- compressed
- mobile fallback image required

### Hero overlay copy

```text
213 RUN

BUILT.
NOT FOUND.

SHOP DROP_001
```

CTA button may use lime.

---

## 9. Homepage UI/UX behavior

The homepage can feel dynamic, like the reference Instagram reels, but it must remain fast and mobile-friendly.

Allowed homepage motion:

- smooth scroll reveal
- subtle image parallax
- hero video
- sticky hero moment if light
- product cards fade/slide in
- community cards slide in softly
- light motion lines

Do not use:

- heavy 3D effects
- gaming neon glow
- scroll-changing product images
- complex animations on mobile
- animations that break performance
- too many moving elements at once

---

## 10. Product page direction

The product page should stay simple, fast, and conversion-focused.

Do not add complex scroll-based image transitions on product pages.

### Mobile product page

- large product image at top
- thumbnails below
- product title
- price
- size/color selection
- add to cart
- product details
- delivery info

### Desktop product page

- product gallery on the left
- sticky product information on the right
- clean layout inspired by Fish Your Style structure
- 213 RUN visual identity only

### Product page must not include

- heavy animation
- scroll image changing
- 3D effects
- gaming style
- blue Fish Your Style styling
- over-designed product interactions

Homepage can be cinematic.  
Product page must prioritize clarity and conversion.

---

## 11. Shop the Look

Keep the "Shop the Look" idea.

It can sell outfits like:

```text
Oversized Tee + Baggy Jogging
Regular Hoodie + Open Leg Pant
Oversized Hoodie + Baggy Jogging
```

A look card should contain:

- full outfit image
- item list
- total price
- CTA: `SHOP THE LOOK` or `ADD ENTIRE FIT`

V1 can keep this simple.  
Do not overbuild a complex look builder before products are stable.

---

## 12. Community feature — 213 RUN Club V1

The community idea is allowed in V1 only as a small controlled feature.

Do not build a full community platform.

### Allowed V1

- homepage section called `213 RUN CLUB`
- submit run form/modal
- one required run proof screenshot
- admin approval
- monthly random giveaway
- homepage shows only approved cards

### Not allowed in V1

- no Strava API
- no leaderboard
- no runner profiles
- no photo editor
- no full community page unless explicitly approved later
- no auto-publishing

### Community section copy

```text
213 RUN CLUB

Share your run.
Build your streak.
One month. One winner.

No need to be fast.
No need to run far.
Just show up.

CTA:
Submit your run
```

---

## 13. Community submission rules

### First launch

Required:

```text
1 run proof screenshot
```

Accepted proof sources:

```text
Strava
Google Fit
Apple Health
Samsung Health
Garmin
Any running app
```

First launch limits:

```text
Max 1 image
Max file size: 2MB
Allowed formats: jpg, jpeg, png, webp
```

Optional runner/outfit photo is disabled for first launch unless explicitly enabled later.

### V1.1 later

Can allow max 2 images:

```text
1 required run proof screenshot
1 optional runner/outfit photo
```

---

## 14. Monthly community cap

To protect Cloudinary free-tier usage, submissions are capped before upload.

V1 monthly cap:

```text
26 submissions per month
```

Important rule:

```text
pending + approved submissions count toward the monthly cap
```

Why?

Because pending uploads already use Cloudinary storage.

### Correct upload flow

```text
User opens submit form
↓
Server verifies Turnstile
↓
Server checks rate limit
↓
Server checks monthly cap
↓
If cap is full: stop, no Cloudinary upload
↓
If cap is open: create signed Cloudinary upload params
↓
Client uploads screenshot
↓
Client sends metadata + Cloudinary public_id
↓
Server creates Firestore doc with status = pending
↓
Admin approves/rejects
↓
Public homepage shows approved only
```

### Rejected submissions

If admin rejects a submission:

```text
Delete associated Cloudinary asset when possible.
Keep minimal rejected metadata only if needed.
```

This protects storage.

---

## 15. Media storage strategy

Use:

```text
Cloudinary = images and videos
Firestore = metadata only
```

Never store base64 images in Firestore.

Firestore stores only:

```text
Cloudinary public_id
secure_url
width
height
bytes
format
status
createdAt
approvedAt
rejectedAt
```

Do not store raw image files in Firestore.

---

## 16. Image optimization rules

All public images must use Cloudinary transformed URLs.

Use transformations such as:

```text
f_auto
q_auto
c_limit
width limits
```

### Product images

```text
Product card: thumbnail around 480px wide
Product detail: medium around 1200px wide
Original: admin/download only, not public by default
```

### Community images

```text
Community card: thumbnail around 360px wide
Admin review: around 900px wide
Original: never displayed publicly
```

### Hero video

- compressed
- WebM + MP4 if possible
- 6 to 8 seconds
- mobile fallback image
- do not make it too heavy

---

## 17. Cloudinary upload rules

Admin product media can use the existing Fish Your Style pattern if the preset is locked down.

Public community uploads must be safer.

Preferred community upload:

```text
server-signed Cloudinary upload
```

Do not issue a Cloudinary upload signature unless:

- Turnstile is valid
- rate limit passes
- monthly cap is not full
- upload intent is valid

Allowed public upload:

```text
image only
jpg/jpeg/png/webp only
2MB max
community pending folder only
```

Do not expose Cloudinary API secret to browser.

---

## 18. Security requirements

Protect all public mutation endpoints.

Required protections:

- server-side validation
- rate limiting
- Cloudflare Turnstile
- honeypot where useful
- generic errors
- admin-only approvals
- no direct client writes
- no auto-publishing

Protect:

```text
/api/orders
/api/contact
/api/newsletter or wishlist
/api/uploads/sign
/api/community-submissions
```

### Orders

Orders must be created only through server API routes.

The server must:

- validate payload
- re-price products from Firestore
- check stock
- run Firestore transaction
- write server timestamps
- update stats if needed
- reject fake prices or manipulated client data

### Community

Community submissions must be:

```text
pending by default
approved manually
shown publicly only after approval
```

### Admin

Only admins can:

- approve/reject/delete submissions
- manage products
- manage orders
- access admin pages
- export orders

Use a consistent custom-claim admin model. Avoid authorization drift.

---

## 19. Low-cost architecture

Use:

```text
Vercel Hobby
Firestore for structured data
Cloudinary for all media
Cloudflare Turnstile for bot protection
Cloudinary transformed images
cursor pagination
manual approval
```

Avoid:

```text
Firebase Storage for public media
Strava API in V1
auto-publishing user content
large public images
unoptimized images
heavy animations
querying unlimited submissions
unnecessary server calls
```

---

## 20. Pagination

Use load-more pagination.

Products:

```text
initial 8
load 8 more
```

Community homepage:

```text
show 3 or 6 approved submissions max
```

If later adding a community listing:

```text
load 8 more
```

Do not query all products or submissions at once.

---

## 21. Fish Your Style migration rules

Fish Your Style is the technical reference, not the visual reference.

Reuse:

- Next.js App Router structure where useful
- Firebase init pattern
- Firebase Admin SDK pattern
- server-side order route
- Firestore transactions
- stock update logic
- admin custom-claim protection
- Firestore rules patterns
- Cloudinary delivery optimization
- product pagination
- Google Sheets export if needed
- GA4/Meta Pixel later
- rate limit/honeypot patterns

Do not reuse:

- Fish Your Style UI
- blue colors
- fishing/cat/old assets
- old copy
- old product categories
- old visual identity
- legacy localStorage order helper if unsafe
- direct client writes for orders

Best approach:

```text
Create a separate 213 RUN project/repo.
Do not touch Fish Your Style.
Reuse stable backend logic carefully.
Rebuild UI from the 213 RUN brand guide.
Use a new Firebase project and new environment variables.
```

---

## 22. Routes for V1

Allowed V1 routes:

```text
/
 /shop
 /drop/[slug]
 /product/[slug]
 /cart
 /checkout
 /order/[id]
 /login
 /admin
 /admin/orders
 /admin/products
 /admin/community
```

Community public page is not required in V1.

Allowed community logic:

```text
homepage micro-section
submit run modal/form
admin review queue
```

Do not build:

```text
/community full page
/journal
/blog
/strava
/challenges
/account/profile
```

unless explicitly approved later.

---

## 23. Admin dashboard

Admin dashboard should support:

- product management
- order management
- community submissions review
- optional export
- basic stats

Community admin review should show:

- name
- city
- distance
- date
- Instagram handle if provided
- proof screenshot thumbnail
- Cloudinary public_id
- status
- approve button
- reject button
- delete asset on rejection when possible

---

## 24. Analytics

Do not add analytics before the website is stable.

Later add:

- GA4
- Meta Pixel
- consent mode
- view_item
- add_to_cart
- begin_checkout
- purchase
- purchase dedupe

Guard scripts if env vars are missing.

Do not break performance for analytics.

---

## 25. Performance rules

Every public page must be mobile-first and fast.

Rules:

- use `next/image`
- use Cloudinary transformed URLs
- never use unoptimized public images
- compress hero video
- use fallback image on mobile
- dynamic import admin dashboard
- do not query Firestore on every render
- use pagination
- use cached public product APIs where safe
- avoid heavy animations on product pages

Target:

```text
Lighthouse mobile above 85
```

---

## 26. Sprint plan

### Sprint 0 — Documentation and repo safety

- confirm separate 213 RUN repo/project
- do not edit Fish Your Style directly
- add/update `AGENTS.md`
- optionally duplicate as `CLAUDE.md`
- confirm new Firebase project plan
- confirm Cloudinary folder/account plan
- commit documentation

### Sprint 1 — Foundation

- clean default Next.js files
- set layout shell
- set design tokens
- set logo assets
- set global styles
- set mobile-first structure
- no backend work yet

### Sprint 2 — Homepage UI

- hero video section
- Drop_001 section
- Shop By Category
- Shop The Look
- 213 RUN Club micro-section
- Brand Philosophy
- Footer
- subtle scroll motion only

### Sprint 3 — Product pages

- product card
- product listing
- product detail page
- cart drawer
- add to cart
- no scroll image-changing animation

### Sprint 4 — Backend migration

- new Firebase project
- Firebase Admin SDK
- Firestore rules
- product fetching
- order creation server route
- stock transaction
- admin auth

### Sprint 5 — Media + community

- Cloudinary signed upload
- upload cap before signature
- community submission API
- pending by default
- admin review queue
- approved-only public display

### Sprint 6 — Security hardening

- Turnstile
- rate limits
- honeypots
- file validation
- direct Firestore write tests
- non-admin API tests

### Sprint 7 — Analytics and launch polish

- GA4
- Meta Pixel
- SEO
- OG images
- final mobile QA
- performance audit

---

## 27. Testing checklist

After each sprint run:

```text
npm run lint
npm run build
```

Before launch test:

- mobile homepage
- product page mobile
- product pagination
- add to cart
- checkout
- order creation
- stock decrement
- admin login
- admin product management
- community submit form
- monthly cap before upload
- Turnstile verification
- rate limit behavior
- invalid image type rejected
- oversized image rejected
- pending submission not public
- approved submission appears public
- rejected submission deletes Cloudinary asset
- direct Firestore writes denied
- non-admin admin API denied

---

## 28. What AI agents must never do

Never:

- redesign the logo
- generate fake logos instead of using the real assets
- make the site mostly dark/neon
- create gaming/cyberpunk UI
- copy Fish Your Style UI colors
- add products not in the plan
- add `/community` full page in V1
- add Strava API in V1
- add leaderboard in V1
- add runner profiles in V1
- auto-publish user uploads
- store base64 images in Firestore
- issue Cloudinary upload signature after monthly cap is full
- use unoptimized public images
- create orders directly from client SDK
- skip Turnstile/rate limits on public mutation endpoints
- build multiple sprints in one session without approval
- commit `.env.local`

---

## 29. Session protocol

When starting a new AI session:

```text
Read AGENTS.md carefully.
We are working on Sprint X.
The task is Y.
Do not write code until you confirm the relevant rules.
After implementation, explain what changed and what I should test.
```

Do not ask AI to do more than one sprint at once.

---

End of 213 RUN Agent Constitution.




## Latest Product + UI Decisions

213 RUN is a running lifestyle / active streetwear brand, not a technical race-performance brand.

Product positioning:
- Use “running lifestyle”
- Use “everyday movement”
- Use “active streetwear”
- Use “after-run comfort”
- Use “made on demand” when relevant
- Do not claim technical race performance or marathon performance gear.

Drop_001 — Summer Build:
- Oversized Tee
- Regular Tee
- Wide Short Oversized
- Open Leg Pant
- Baggy Jogger Oversized

Winter Warmup:
- Oversized Hoodie
- Neck Warmer
- Run Hat
- These can be available as made-on-demand / promo / winter capsule.

Shop The Look:
- Do not navigate to another page when clicking a look.
- Future behavior should be a quick-view drawer / slide-over drawer.
- Look cards should show a lifestyle outfit image on top and product items below.
- Looks:
  1. Summer Road — Oversized Tee + Wide Short
  2. City Everyday — Regular Tee + Open Leg Pant
  3. Evening Layer — Oversized Tee + Baggy Jogger
  4. Winter Warmup — Oversized Hoodie + Neck Warmer + Hat

Product images:
- Product cards should use clean product PNG/studio images.
- Shop The Look should use lifestyle images: nature, city, winter.
- Do not leave blank image cards in the UI.
- If real product images are not available, use local placeholder images with correct aspect ratio.

Navigation:
- Do not add Journal in V1.
- Use: Shop, Drop_001, Run Club, About.

Brand Philosophy:
Keep it short:
“You don’t find yourself.
You build yourself.
BUILT. NOT FOUND.”