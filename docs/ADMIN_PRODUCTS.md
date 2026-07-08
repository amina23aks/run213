# 213 RUN Admin Products

This sprint adds the minimum admin product workflow needed to create real Firestore products for storefront and order testing.

## Required environment variables

Firebase client variables are required for the admin browser login and public storefront reads:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Firebase Admin SDK variables are required for protected server API routes:

```bash
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Admin allowlist variables control who can use admin APIs:

```bash
SUPER_ADMIN_EMAIL=owner@example.com
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

Emails are normalized to lowercase before checks.

## How admin auth works

- `/admin/products` loads Firebase Auth in the browser.
- Admins can sign in with Google or Firebase Email/Password.
- The browser sends the Firebase ID token as `Authorization: Bearer <token>` to `/api/admin/products` routes.
- Server API routes verify the ID token with Firebase Admin Auth.
- The verified token email must match `SUPER_ADMIN_EMAIL` or one of `ADMIN_EMAILS`.
- The UI shows the product form only after the server confirms access by returning the products list.
- Product writes are never sent directly from the browser to Firestore.

## Product creation and editing

The admin form supports:

- `name`
- `slug`
- `description`
- `category`
- `priceDzd`
- optional `compareAtPriceDzd`
- image URL/path strings, one per line
- colors as `Name|#HEX`, one per line
- sizes as comma-separated labels
- `status`: `draft`, `active`, or `archived`
- `inStock`
- `stockMode`: `unlimited` or `limited`
- optional `stockQty`
- `isPromo`
- `dropSlug`
- `sortOrder`

Create and update requests are validated on the server with a strict Zod schema before Firebase Admin SDK writes to Firestore.

Archive uses the same protected API and sets `status: archived`. It does not hard delete product documents.

## Image fields for now

Images are URL/path strings only in this sprint. Use existing public asset paths such as `/tshirt.png` or a hosted image URL. Cloudinary upload and signed upload security belong to the later Cloudinary sprint.

## Homepage placement fields

The admin form also stores placement fields for current and future storefront sections:

- `showInDrop001`: active products appear in homepage `DROP_001`.
- `showInFeaturedDrop`: active products appear in homepage `FEATURED DROP`.
- `showInShopTheLook`: saved for future Shop The Look pages, but no Shop The Look page is built in this sprint.
- `featuredSortOrder`: optional sort order for Featured Drop.
- `lookGroupSlug`: optional future grouping key for Shop The Look.

Public storefront reads require `status == "active"`. If Firestore is empty or unavailable, static fallback products are used.

## Manual Firebase setup

1. Enable Firebase Authentication.
2. Enable Google sign-in.
3. Enable Email/Password sign-in if you want email login.
4. Create admin users in Firebase Auth.
5. Add their emails to `SUPER_ADMIN_EMAIL` or `ADMIN_EMAILS`.
6. Create/deploy Firestore indexes if Firebase prompts for the homepage placement queries.
