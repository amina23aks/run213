@AGENTS.md
# RUN 213 — Project Constitution
# The single source of truth for every AI agent, developer, and contributor.
# File: CLAUDE.md — place this in the root of the run213/ project.
# Last updated: Sprint 0 (Foundation)

---

## 0. HOW TO USE THIS DOCUMENT

Every time you open a new Codex or Cursor session, paste this document first.
Then say: "We are working on Sprint X. The task is Y."
Never skip this step. This document IS the project memory.

---

## 1. PROJECT IDENTITY

**Brand name:** RUN 213
**Type:** Premium running and streetwear e-commerce brand
**Market:** Algerian runners and fitness community
**Domain target:** run213.dz (or run213.com)
**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + Firebase + Framer Motion
**Repo:** GitHub (main branch = production via Vercel auto-deploy)
**Related project:** Fish Your Style (separate project — source of backend logic only, never copy UI)

**Brand positioning in one sentence:**
RUN 213 is not a store. It is the first premium running lifestyle brand built specifically for Algerian runners — where discipline, pace, and local identity meet modern streetwear.

**Tone of voice:**
- Short. Minimal. Confident.
- Never salesy. Never loud.
- Copy in English only for V1. Darja phrases allowed as cultural flavor (single sentences only).
- Less than 8 words per headline.
- Zero exclamation marks.

---

## 2. BUSINESS RULES — READ BEFORE WRITING ANY CODE

### 2.1 The MVP Contract
V1 ships only these pages. Nothing else.

| Page | Route | Priority |
|------|-------|----------|
| Homepage | / | P0 |
| Drop landing | /drop/[slug] | P0 |
| Product detail (PDP) | /product/[slug] | P0 |
| Ensemble detail | /ensemble/[slug] | P0 |
| Shop / collection | /shop | P0 |
| Cart | /cart | P0 |
| Checkout | /checkout | P0 |
| Order confirmation | /order/[id] | P0 |
| Admin dashboard | /admin | P1 |
| Admin orders | /admin/orders | P1 |
| Admin products | /admin/products | P1 |
| Login (admin only) | /login | P1 |

**DO NOT BUILD:** /community, /journal, /blog, /strava, /challenges, /account/profile
These are V2. If Codex suggests building them, refuse.

### 2.2 The Ensemble Rule (Most Important Commerce Feature)
RUN 213 sells two types of products:

**Type A — Single product** (`/product/[slug]`)
- One item, one price, size picker
- Always shows ensemble upsell at bottom: "Complete the look"

**Type B — Ensemble** (`/ensemble/[slug]`)
- 2–4 items sold as one outfit bundle
- Each item has its own size picker
- One "Add entire fit to bag" button that adds all items at once
- Ensemble price = sum of items (no discount in V1, discount optional in V2)
- This is the highest-priority commerce feature. It MUST work perfectly.

### 2.3 The Look Builder Rule (Homepage Feature)
On the homepage, the "Shop the Look" section shows full outfits.
Each outfit card has:
- A full editorial image of the complete look
- Item list with individual prices
- Total price
- One CTA: "ADD ENTIRE FIT" — adds all items to cart simultaneously
This is different from the Ensemble PDP. This is a quick-add from the homepage.

### 2.4 Conversion First Rule
The homepage has ONE job: get the user to tap a product within 5 seconds.
Section order is FIXED. Do not change it without explicit instruction:
1. Hero (video + 6-word headline + 2 buttons)
2. Drop 01 product grid (immediate — no scroll required on desktop)
3. Shop the Look (ensemble section)
4. Individual products (simple 3-column grid)
5. One manifesto line (single sentence, Darja optional)
6. Community micro-section (3 photos + "Run with us" — nothing more)
7. Footer

---

## 3. ARCHITECTURE

### 3.1 Folder structure
Every file must be in its correct folder. Do not invent new folders without explicit instruction.

```
run213/
├── app/                          # Next.js App Router
│   ├── (store)/                  # Public-facing store routes
│   │   ├── layout.tsx            # Store layout (nav + footer)
│   │   ├── page.tsx              # Homepage
│   │   ├── shop/
│   │   │   └── page.tsx
│   │   ├── drop/
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── product/
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── ensemble/
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── cart/
│   │   │   └── page.tsx
│   │   └── checkout/
│   │       └── page.tsx
│   ├── (admin)/                  # Admin routes (protected)
│   │   ├── layout.tsx            # Admin layout
│   │   ├── admin/
│   │   │   ├── page.tsx          # Dashboard
│   │   │   ├── orders/
│   │   │   │   └── page.tsx
│   │   │   └── products/
│   │   │       └── page.tsx
│   │   └── login/
│   │       └── page.tsx
│   ├── api/                      # API routes
│   │   ├── orders/
│   │   │   └── route.ts
│   │   └── export/
│   │       └── route.ts          # CSV export (from Fish Your Style)
│   ├── globals.css               # Design tokens + global styles
│   └── layout.tsx                # Root layout
├── components/
│   ├── ui/                       # Base design system components
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   └── SizePicker.tsx
│   ├── layout/                   # Layout components
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── CartDrawer.tsx
│   ├── home/                     # Homepage sections
│   │   ├── Hero.tsx
│   │   ├── DropSection.tsx
│   │   ├── ShopTheLook.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── ManifestoLine.tsx
│   │   └── CommunityMicro.tsx
│   ├── product/                  # Product-related components
│   │   ├── ProductCard.tsx
│   │   ├── ProductGallery.tsx
│   │   ├── EnsembleModule.tsx
│   │   └── LookBuilder.tsx
│   └── admin/                    # Admin dashboard components
│       ├── OrdersTable.tsx
│       ├── ProductsTable.tsx
│       └── StockAlert.tsx
├── lib/                          # Business logic (migrated from Fish Your Style)
│   ├── firebase.ts               # Firebase init
│   ├── auth.ts                   # Admin auth logic
│   ├── products.ts               # Product CRUD
│   ├── orders.ts                 # Order management
│   ├── cart.ts                   # Cart state logic
│   └── export.ts                 # CSV export
├── hooks/                        # Custom React hooks
│   ├── useCart.ts
│   ├── useProducts.ts
│   └── useOrders.ts
├── types/                        # TypeScript interfaces
│   ├── product.ts
│   ├── ensemble.ts
│   ├── order.ts
│   └── cart.ts
├── constants/                    # Static data
│   └── navigation.ts
├── public/                       # Static assets
│   ├── fonts/
│   └── images/
├── CLAUDE.md                     # This file
└── .env.local                    # Never commit. Never share with Fish Your Style.
```

### 3.2 Data models (TypeScript)

```typescript
// types/product.ts
export type ProductCategory =
  | 'tshirt-oversized'
  | 'tshirt-regular'
  | 'hoodie-zip'
  | 'hoodie-balaclava'
  | 'hoodie-winter'
  | 'pants-open'
  | 'pants-baggy'
  | 'shorts-wide'
  | 'bag-tote'
  | 'bag-sport'
  | 'hat'
  | 'neck-warmer'

export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'

export interface Product {
  id: string
  slug: string
  name: string
  shortName: string           // e.g. "FLOW 001"
  category: ProductCategory
  dropSlug: string            // e.g. "drop-01"
  price: number               // in DZD (e.g. 3900)
  sizes: Size[]
  stock: Record<Size, number> // { M: 12, L: 0 }
  images: string[]            // Firebase Storage URLs
  isActive: boolean
  createdAt: number           // timestamp
}

// types/ensemble.ts
export interface EnsembleItem {
  productId: string
  product?: Product           // populated at render time
}

export interface Ensemble {
  id: string
  slug: string
  name: string
  dropSlug: string
  items: EnsembleItem[]       // 2–4 products
  heroImage: string           // editorial full-outfit image
  isActive: boolean
  createdAt: number
}

// types/cart.ts
export interface CartItem {
  productId: string
  size: Size
  quantity: number
  price: number
  name: string
  image: string
}

export interface Cart {
  items: CartItem[]
  total: number
  itemCount: number
}

// types/order.ts
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

export interface Order {
  id: string
  items: CartItem[]
  total: number
  status: OrderStatus
  customer: {
    name: string
    phone: string
    wilaya: string
    address: string
  }
  createdAt: number
}
```

---

## 4. DESIGN SYSTEM — NEVER DEVIATE FROM THESE VALUES

### 4.1 Colors
All colors are defined as CSS custom properties in `app/globals.css`.
Never hardcode hex values in components. Always use CSS variables or Tailwind tokens.

```css
:root {
  /* Surfaces — darkest to lightest */
  --color-void:      #0A0A0A;   /* Page background */
  --color-ground:    #111111;   /* Navbar background */
  --color-surface:   #1A1A1A;   /* Card backgrounds */
  --color-elevation: #2A2A2A;   /* Elevated / selected state */
  --color-border:    #3D3D3D;   /* All borders and dividers */

  /* Text */
  --color-chalk:     #E8E6DF;   /* Primary text — never use pure white */
  --color-stone:     #B8B4AA;   /* Secondary text */
  --color-ash:       #7A7570;   /* Muted text, labels, captions */

  /* Accent */
  --color-sand:      #D4C5A9;   /* Prices, warm secondary */
  --color-ember:     #E86B3A;   /* Primary CTA, hover accent, stock alerts */

  /* Semantic */
  --color-success:   #1D9E75;
  --color-warning:   #BA7517;
  --color-danger:    #E24B4A;
}
```

Tailwind `tailwind.config.ts` must extend with these exact tokens:
```typescript
colors: {
  void: '#0A0A0A',
  ground: '#111111',
  surface: '#1A1A1A',
  elevation: '#2A2A2A',
  border: '#3D3D3D',
  chalk: '#E8E6DF',
  stone: '#B8B4AA',
  ash: '#7A7570',
  sand: '#D4C5A9',
  ember: '#E86B3A',
}
```

### 4.2 Typography

**Primary font:** Neue Haas Grotesk Display (if unavailable: "Inter")
**Fallback stack:** 'Neue Haas Grotesk Display', 'Inter', system-ui, sans-serif
**Never use:** serif fonts, decorative fonts, or Google Fonts that look generic

Type scale (mobile-first, desktop in parentheses):

| Token | Size | Weight | Tracking | Line Height | Usage |
|-------|------|--------|----------|-------------|-------|
| display | 48px (96px) | 300 | -0.04em | 0.95 | Brand name, hero |
| h1 | 32px (64px) | 300 | -0.03em | 1.05 | Page headlines |
| h2 | 22px (40px) | 300 | -0.02em | 1.1 | Section headings |
| h3 | 16px (20px) | 400 | -0.01em | 1.2 | Card titles |
| eyebrow | 10px (11px) | 500 | +0.12em | 1.4 | Labels (UPPERCASE) |
| body | 15px (16px) | 400 | 0 | 1.65 | Paragraph text |
| caption | 12px (12px) | 400 | +0.02em | 1.5 | Captions, meta |
| price | 18px (22px) | 400 | -0.01em | 1.2 | Product prices |
| cta | 11px (11px) | 500 | +0.08em | 1 | Button text (UPPERCASE) |

### 4.3 Spacing scale
Use multiples of 4px. Tailwind default spacing is fine.
Section padding: 80px mobile / 120px desktop (top and bottom).
Component internal gap: 12–24px.
Card padding: 16px mobile / 20px desktop.

### 4.4 Border radius
**Zero border radius on all product cards and CTA buttons.** Sharp edges = premium signal.
Border radius is allowed ONLY on: modals, drawers, admin UI, tooltips (8–12px).

### 4.5 Component rules

**Button — Primary**
- Background: `var(--color-ember)` / `bg-ember`
- Text: white, 11px, uppercase, letter-spacing +0.08em
- Height: 52px (mobile), 48px (desktop)
- Width: full-width on mobile, auto (min 160px) on desktop
- Border radius: 0
- Hover: brightness(1.1), transition 150ms
- Active: scale(0.97), transition 80ms

**Button — Ghost**
- Background: transparent
- Border: 0.5px solid `var(--color-chalk)`
- Text: chalk, same as primary
- Hover: background chalk at 6% opacity
- Active: scale(0.97)

**Product Card**
- Border radius: 0
- Image: aspect-ratio 3/4, object-fit cover
- Hover (desktop only): image scale(1.04) over 400ms ease
- No add-to-cart button on the card — card taps go to PDP
- Show: eyebrow (category), product name, price in DZD
- "Shop the look" pill on Ensemble cards: always visible (not hover-only)

**Navbar**
- Height: 52px mobile / 60px desktop
- Background: `rgba(17, 17, 17, 0.92)` with `backdrop-blur: 12px`
- Always sticky (position: fixed, top: 0)
- Left: RUN 213 logotype
- Right: Search icon + Bag icon (with item count)
- Mobile: hamburger icon
- Mobile menu: full-screen overlay, bg void, links stagger in from left

**Size Picker**
- Grid: 5 columns
- Unselected: border `var(--color-border)`, text `var(--color-ash)`, bg transparent
- Selected: border `var(--color-chalk)`, text `var(--color-chalk)`, bg `var(--color-elevation)`
- Out of stock: diagonal SVG line, border border, text border (muted)
- Transition: 150ms ease on all states

---

## 5. MOTION SYSTEM — EXACT VALUES

Framer Motion is the ONLY animation library allowed. No CSS keyframes for UI animations (CSS-only for marquee/ambient effects only).

### 5.1 Timing tokens
```typescript
// constants/motion.ts
export const motion = {
  snap: { duration: 0.08, ease: 'easeOut' },           // Hover states
  micro: { duration: 0.15, ease: 'easeOut' },          // Button press
  standard: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }, // Panel open
  cinematic: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }, // Hero, page
  stagger: 0.08,                                        // Per-child delay
}
```

### 5.2 Scroll reveal (use on every section)
```typescript
// Default scroll-reveal animation — apply to every section wrapper
const scrollReveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
}
```

### 5.3 Hero load sequence
Order and timing is FIXED. Do not change.
1. `t=0ms` — Video starts playing (muted, autoplay, loop)
2. `t=100ms` — Eyebrow label fades in (opacity 0→1, y 10→0, 400ms)
3. `t=300ms` — H1 headline (opacity 0→1, y 40→0, 700ms)
4. `t=700ms` — CTA buttons (opacity 0→1, y 20→0, stagger 120ms between buttons)

### 5.4 Page transitions
Use `AnimatePresence` with `mode="wait"`:
- Exit: opacity 0, duration 150ms
- Enter: opacity 0→1, y 20→0, duration 300ms

### 5.5 Add to bag interaction
1. Button text: "Add to bag" → "Added ✓" for 1500ms → back to "Add to bag"
2. Bag icon in navbar: scale(1.3) bounce, duration 300ms
3. Cart drawer slides up from bottom (mobile) or right (desktop), 350ms

### 5.6 Marquee tape (CSS only)
```css
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.marquee-track {
  animation: marquee 20s linear infinite;
}
.marquee-track:hover {
  animation-play-state: paused;
}
```

### 5.7 Rules
- ALWAYS wrap animations with `prefers-reduced-motion` check
- NEVER animate on mobile if the animation requires `transform: scale` on the entire page
- Stagger product grids: 80ms per card
- Do not stack more than 2 animations simultaneously on the same element

---

## 6. PERFORMANCE RULES

Every page must score above 85 on Lighthouse mobile. These rules are non-negotiable.

1. **Images:** Always use `next/image`. Never use `<img>`. Set `priority` on above-the-fold images. Use `sizes` prop on all product images.
2. **Video:** Hero video must be `<video>` tag, not an `<iframe>`. Attributes: `autoPlay muted loop playsInline`. Provide WebM + MP4 formats.
3. **Firebase:** Never call Firestore on every render. Use `unstable_cache` for product data. Use SWR for client-side cart and order data.
4. **Code splitting:** Use `dynamic()` import for the admin dashboard. It must never be included in the storefront bundle.
5. **Firestore listeners:** Every `onSnapshot` must return its unsubscribe function in `useEffect` cleanup.
6. **Fonts:** Preload the primary font. Use `font-display: swap`.
7. **No layout shift:** All images must have explicit width/height or use `fill` with a sized container.

---

## 7. FIREBASE RULES

### 7.1 Environment variables
RUN 213 uses its OWN Firebase project. Never use Fish Your Style's Firebase credentials.
File: `.env.local` (never commit to GitHub)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
ADMIN_EMAIL=
```

### 7.2 Firestore collections
```
/products/{productId}       — Product documents
/ensembles/{ensembleId}     — Ensemble documents
/orders/{orderId}           — Order documents
/drops/{dropSlug}           — Drop metadata
```

### 7.3 What to migrate from Fish Your Style
Copy ONLY these files and adapt:
- Firebase init pattern (`lib/firebase.ts`)
- Admin auth check middleware
- Order creation logic
- CSV export API route
- Admin security rules (Firestore rules)

Do NOT copy any component, any style, any page, or any UI element from Fish Your Style.

---

## 8. RESPONSIVE BEHAVIOR

Mobile-first. All CSS written mobile first, then `md:` and `lg:` overrides.

| Breakpoint | Width | Behavior |
|-----------|-------|----------|
| Mobile | 375px–767px | Single column, full-width CTAs, bottom sticky cart bar |
| Tablet | 768px–1279px | 2-column grid, side-by-side PDP |
| Desktop | 1280px+ | 3–4 column grid, sticky sidebar on PDP |
| Max width | 1440px | Content max-width, centered |

Key responsive rules:
- Product grid: 1 col mobile / 2 col tablet / 3 col desktop
- Ensemble module: bottom sheet (mobile) / sidebar sticky (desktop)
- Navbar: hamburger mobile / full links desktop
- Hero: video full-screen mobile / constrained desktop

---

## 9. ACCESSIBILITY

- All interactive elements must have visible focus styles (`outline: 2px solid var(--color-ember)`)
- All images must have descriptive `alt` text
- Color contrast: chalk on void = 12.5:1 (passes AAA)
- Keyboard navigation must work for: navbar, size picker, add to bag, cart
- Screen reader: use `aria-label` on icon-only buttons (bag, search, close)

---

## 10. CODING STANDARDS

- TypeScript strict mode. No `any` types.
- No inline styles. Use Tailwind classes only. For dynamic values, use CSS variables.
- All components are functional. No class components.
- All data fetching in Server Components by default. Use Client Components only when you need: useState, useEffect, event listeners, Framer Motion.
- File naming: PascalCase for components (`ProductCard.tsx`), kebab-case for routes (`/product/[slug]`), camelCase for hooks and utils.
- Every component receives typed props. No untyped props.
- Export components as named exports. No default exports except for pages.

---

## 11. SPRINT PLAN

### Sprint 0 — Foundation (NOW)
- [ ] Clean default Next.js files
- [ ] Set up folder structure from Section 3.1
- [ ] Set up `globals.css` with all color tokens from Section 4.1
- [ ] Set up `tailwind.config.ts` with custom tokens
- [ ] Set up `constants/motion.ts`
- [ ] Set up TypeScript types from Section 3.2
- [ ] Verify dev server runs and shows blank dark page
- [ ] Commit: "Sprint 0 complete — foundation"

### Sprint 1 — Layout shell
- [ ] Navbar component
- [ ] Footer component
- [ ] Store layout (`app/(store)/layout.tsx`)
- [ ] Mobile menu overlay
- [ ] Cart drawer (empty state)
- [ ] Verify on mobile + desktop
- [ ] Commit: "Sprint 1 complete — layout shell"

### Sprint 2 — Homepage
- [ ] Hero section (video + text + CTA)
- [ ] Drop section (product grid, 3 cards)
- [ ] Shop the Look section (2 ensemble cards + ADD ENTIRE FIT)
- [ ] Product grid (3 cards)
- [ ] Manifesto line
- [ ] Community micro-section
- [ ] Framer Motion scroll reveals on all sections
- [ ] Hero load sequence animation
- [ ] Marquee tape
- [ ] Commit: "Sprint 2 complete — homepage"

### Sprint 3 — Product & Ensemble pages
- [ ] Product card component
- [ ] Product detail page (PDP)
- [ ] Size picker component
- [ ] Add to bag interaction + cart drawer
- [ ] Ensemble module (complete the look)
- [ ] Ensemble PDP page
- [ ] Product gallery (swipeable mobile)
- [ ] Commit: "Sprint 3 complete — product pages"

### Sprint 4 — Cart & Checkout
- [ ] Cart page
- [ ] Cart item component
- [ ] Checkout form (name, phone, wilaya, address)
- [ ] Order confirmation page
- [ ] Commit: "Sprint 4 complete — cart/checkout"

### Sprint 5 — Backend (Firebase migration)
- [ ] New Firebase project created
- [ ] `.env.local` configured
- [ ] Firebase init (`lib/firebase.ts`)
- [ ] Product fetching from Firestore
- [ ] Order creation to Firestore
- [ ] Admin auth middleware
- [ ] Admin dashboard (migrated from Fish Your Style)
- [ ] Orders page
- [ ] Products management page
- [ ] CSV export
- [ ] Commit: "Sprint 5 complete — backend"

### Sprint 6 — Polish & Launch
- [ ] Framer Motion page transitions
- [ ] All micro-interactions
- [ ] Lighthouse audit (target: 85+ mobile)
- [ ] Meta Pixel integration
- [ ] TikTok Pixel integration
- [ ] Google Analytics 4
- [ ] OG images for social sharing
- [ ] Final mobile QA
- [ ] Commit: "Sprint 6 complete — launch ready"

---

## 12. WHAT CODEX/CURSOR MUST NEVER DO

- Never install additional UI libraries (no shadcn, no MUI, no Chakra, no Radix UI)
- Never use `<img>` — always `next/image`
- Never copy UI from Fish Your Style
- Never use serif fonts
- Never add border-radius to product cards or CTA buttons
- Never build community, blog, journal, or account pages in V1
- Never commit `.env.local`
- Never use `any` in TypeScript
- Never put Firebase credentials in code — always use env variables
- Never use `window.localStorage` for cart — use React Context + sessionStorage
- Never skip the `prefers-reduced-motion` check on animations
- Never add features not listed in the current Sprint

---

## 13. SESSION PROTOCOL

When starting a new Codex or Cursor session:

1. Paste this entire CLAUDE.md file
2. State which Sprint you are working on
3. State the specific task within that Sprint
4. Ask Codex to confirm it has read the document before writing code
5. After each task, ask Codex to commit with a descriptive message
6. Never ask Codex to do more than one Sprint per session

Example session opener:
```
Read the CLAUDE.md above carefully.
We are on Sprint 1, task: Navbar component.
Build the Navbar component according to the design system in Section 4.
Confirm you understand the rules before writing any code.
```

---

*End of CLAUDE.md — RUN 213 Project Constitution*
*Version: 1.0 | Sprint: 0 | Status: Active*
