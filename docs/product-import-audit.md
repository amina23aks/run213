# Product bulk import and private-cost audit

## Canonical model

The canonical admin flow validates `adminProductInputSchema`, derives `inStock` with `withCanonicalStock`, and stores that value plus server timestamps and `updatedBy` in `products`. Product images are records with `id`, URL, alt text, optional Cloudinary `publicId`, `sortOrder`, `isPrimary`, and optional `colorId`. Multiple image records may share a color ID: the product gallery filters all images for the selected color and falls back to the complete gallery.

Storefront list, placement, promo, Look-resolution, and slug reads use Firebase Admin on the server. Checkout independently reads canonical Product documents inside its order transaction, validates variants/stock, recalculates prices, and copies costs into the private order `admin` snapshot. Historical Orders are not consulted or modified by this importer.

The TypeScript Product type also permits `made_to_order` and `archived`, while the current admin input intentionally accepts only `unlimited`/`limited` and `draft`/`active`. The importer follows the admin input contract rather than creating a second document shape.

## Cost privacy finding and remediation

Before this change, `firestore.rules` allowed any browser to read an entire active `/products/{id}` document. Firestore rules authorize documents, not selected fields, so this exposed `costPriceDzd` (and every other field) through the Firebase Web SDK or REST API. In addition, the server storefront parser copied `costPriceDzd` into Product objects passed to UI components.

The smallest safe architecture is now enforced: direct Product document reads require an admin claim, storefront pages continue using their existing server-side Admin SDK reads, and the storefront Product projection omits cost. The same protection and projection apply to active Look documents because they contain an aggregate cost snapshot. Server checkout still reads the canonical documents directly and retains canonical order cost snapshots. Deploying the changed rules is a required manual action; this task does not deploy them.

## Import behavior

The private staging file is exactly `data/products-import.local.json` and is narrowly ignored. The committed importer:

- defaults to dry run and requires `--write` for mutations;
- reads `.env.local` through Node's existing cross-platform `--env-file` convention;
- only reads/writes `products`; Look collections are read solely to protect referenced color IDs;
- rejects missing/null/invalid required values rather than coercing them to zero;
- validates canonical categories, stock rules, sizes, colors, and HTTPS Cloudinary delivery URLs;
- derives the Cloudinary public ID without uploading or copying an asset;
- creates one canonical image record per URL, allowing many records to share one `colorId`, and makes only the first Product image primary;
- treats duplicate staging slugs or multiple existing documents for a slug as `SKIP`;
- preserves a matching existing canonical color ID by ID, case-insensitive name, or hex, and preserves every unrelated existing Product field by issuing a narrow update patch;
- creates fully validated new Products as `draft` with the current admin defaults.

Dry run:

```bash
npm run products:import -- --file data/products-import.local.json --dry-run
```

The `--dry-run` flag is documentary (dry run is the default). Future intentional write command — **do not run until the rule deployment and catalog review are complete**:

```bash
npm run products:import -- --file data/products-import.local.json --write
```

Known blockers from the supplied catalog notes remain: Sacoche Regular size; High Neck ZipShirt Regular canonical category; Wide Short Oversized cost and sizes; and Zip-Hoodie Regular cost and sizes. Selling prices, stock modes/quantities, descriptions, colors, and Cloudinary URLs must also be present in the actual private staging file for every Product.
