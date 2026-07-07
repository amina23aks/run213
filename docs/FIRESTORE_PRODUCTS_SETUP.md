# Firestore products setup

Sprint B prepares public product reads from Firestore without requiring Firestore data during local development. If Firestore is empty, unavailable, or not configured, `/shop` and `/product/[slug]` fall back to the current static 213 RUN products.

## Collection

Use the `products` collection. Each document can use the product slug as the document ID.

Public storefront reads only documents where:

```txt
status == "active"
```

Draft or archived products are intentionally ignored by the public helpers.

## Product document schema

```ts
type Product = {
  id: string; // Firestore document ID, usually same as slug
  slug: string;
  name: string;
  description: string;
  details: string[];
  category: "tshirts" | "pants" | "hoodies" | "accessories";
  status: "draft" | "active" | "archived";
  priceDzd: number;
  compareAtPriceDzd: number | null;
  images: { url: string; alt: string }[];
  colors: { name: string; hex: string }[];
  sizes: { label: string }[];
  stockMode: "unlimited" | "limited" | "made_to_order";
  stockQty: number | null;
  inStock: boolean;
  featured: boolean;
  isPromo: boolean;
  dropSlug: "drop-001" | null;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
};
```

## Minimal seed JSON

Create these documents in `products` to match the current shop UI. The placeholder image paths are local public assets; replace them later with approved Cloudinary delivery URLs after the upload sprint.

```json
[
  {
    "id": "oversized-tee",
    "slug": "oversized-tee",
    "name": "Oversized Tee",
    "description": "Built for daily movement. Soft, structured, and made for the runners who show up.",
    "details": ["Oversized fit", "Soft cotton feel", "Designed for daily wear", "213 RUN print", "Made for movement"],
    "category": "tshirts",
    "status": "active",
    "priceDzd": 2900,
    "compareAtPriceDzd": null,
    "images": [{ "url": "/tshirt.png", "alt": "Oversized Tee product image" }],
    "colors": [{ "name": "Black", "hex": "#111111" }, { "name": "Cream", "hex": "#f6efe4" }, { "name": "Grey", "hex": "#8a8f75" }],
    "sizes": [{ "label": "S" }, { "label": "M" }, { "label": "L" }, { "label": "XL" }],
    "stockMode": "made_to_order",
    "stockQty": null,
    "inStock": true,
    "featured": true,
    "isPromo": false,
    "dropSlug": "drop-001",
    "sortOrder": 10,
    "createdAt": null,
    "updatedAt": null
  },
  {
    "id": "regular-tee",
    "slug": "regular-tee",
    "name": "Regular Tee",
    "description": "Built for daily movement. Soft, structured, and made for the runners who show up.",
    "details": ["Designed for daily wear", "Unisex active streetwear fit", "Comfort all day", "Made to move with you"],
    "category": "tshirts",
    "status": "active",
    "priceDzd": 2400,
    "compareAtPriceDzd": null,
    "images": [{ "url": "/tshirt.png", "alt": "Regular Tee product image" }],
    "colors": [{ "name": "Cream", "hex": "#f6efe4" }, { "name": "Black", "hex": "#111111" }, { "name": "Lime", "hex": "#c8ff00" }],
    "sizes": [{ "label": "S" }, { "label": "M" }, { "label": "L" }, { "label": "XL" }],
    "stockMode": "made_to_order",
    "stockQty": null,
    "inStock": true,
    "featured": true,
    "isPromo": false,
    "dropSlug": "drop-001",
    "sortOrder": 20,
    "createdAt": null,
    "updatedAt": null
  },
  {
    "id": "hat-neck-warmer-regular",
    "slug": "hat-neck-warmer-regular",
    "name": "Hat / Neck Warmer Regular",
    "description": "Built for daily movement. Soft, structured, and made for the runners who show up.",
    "details": ["Designed for daily wear", "Unisex active streetwear fit", "Comfort all day", "Made to move with you"],
    "category": "accessories",
    "status": "active",
    "priceDzd": 1700,
    "compareAtPriceDzd": 2000,
    "images": [{ "url": "/accs.png", "alt": "Hat / Neck Warmer Regular product image" }],
    "colors": [{ "name": "Black", "hex": "#111111" }, { "name": "Cream", "hex": "#e8dfd2" }],
    "sizes": [],
    "stockMode": "made_to_order",
    "stockQty": null,
    "inStock": true,
    "featured": false,
    "isPromo": true,
    "dropSlug": "drop-001",
    "sortOrder": 90,
    "createdAt": null,
    "updatedAt": null
  }
]
```

## Manual seed steps

1. Open the Firebase console for the 213 RUN project.
2. Go to **Firestore Database** → **Data**.
3. Create the `products` collection if it does not exist.
4. Add one document per product. Use the `id` value from the JSON as the Firestore document ID.
5. Copy every field except `id` into the document body.
6. Keep `status` set to `active` only for products that should appear publicly.
7. Keep `sortOrder` ascending for shop display order.
8. Add the remaining current products using the same schema from `constants/products.ts`.
9. Run `npm run build` after seeding to confirm the storefront can read products or fall back safely.

## Required index

The shop helper queries active products ordered by sort order. If Firebase asks for an index, create:

```txt
products: status ASC, sortOrder ASC
```

The product detail helper queries by slug and active status. If Firebase asks for an index, create:

```txt
products: slug ASC, status ASC
```
