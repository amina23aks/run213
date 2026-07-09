/**
 * Product categories available in the store.
 */
export type ProductCategory = string;

/**
 * Product color variant.
 * Primary shape uses hex strings; legacy objects are supported for compatibility.
 */
export type ProductColor =
  | string
  | {
      /** Hex value used as the primary identifier (e.g., "#000000") */
      hex: string;
      /** Optional image reference for the color */
      image?: string;
      /** Optional sold-out indicator for this color */
      soldOut?: boolean;
      /** Optional legacy fields retained for compatibility */
      id?: string;
      labelFr?: string;
      labelAr?: string;
    }
  | {
      /** Legacy identifier */
      id: string;
      /** French color label */
      labelFr: string;
      /** Arabic color label (optional) */
      labelAr?: string;
      /** Image URL for this color variant (optional) */
      image?: string;
      /** Optional sold-out indicator for this color */
      soldOut?: boolean;
    };

/** Normalized color option used by the storefront UI. */
export type ProductColorOption = {
  hex: string;
  label?: string;
  image?: string;
  soldOut: boolean;
};

/** Normalized size option used by the storefront UI. */
export type ProductSizeOption = {
  value: string;
  soldOut: boolean;
};

/**
 * Product image structure with main image and gallery.
 */
export type ProductImages = {
  /** Main product image URL */
  main: string;
  /** Array of additional gallery image URLs */
  gallery: string[];
};

/**
 * Complete product definition matching the products.json structure.
 * All products are stored in JSON and loaded via src/lib/products.ts.
 */
export type Product = {
  /** Unique product identifier */
  id: string;
  /** URL-friendly product slug */
  slug: string;
  /** French product name */
  nameFr: string;
  /** Arabic product name */
  nameAr: string;
  /** Product category */
  category: ProductCategory;
  /** Product kind/type (e.g., "hoodie", "pants") */
  kind: string;
  /** Fit style (e.g., "regular", "oversized") */
  fit: string;
  /** Price in Algerian Dinar */
  priceDzd: number;
  /** Currency code (always "DZD") */
  currency: "DZD";
  /** Target gender (e.g., "unisex") */
  gender: string;
  /** Available sizes array */
  sizes: string[];
  /** Available color variants */
  colors: ProductColor[];
  /** Whether the size guide should be displayed */
  sizeGuideEnabled?: boolean;
  /** Size guide image URL (Cloudinary secure_url) */
  sizeGuideImageUrl?: string | null;
  /** Size guide image public ID (Cloudinary public_id) */
  sizeGuideImagePublicId?: string | null;
  /** Sizes that should be treated as sold out (manual flag) */
  soldOutSizes?: string[];
  /** Color codes that should be treated as sold out (manual flag) */
  soldOutColorCodes?: string[];
  /** Product images */
  images: ProductImages;
  /** French product description */
  descriptionFr: string;
  /** Arabic product description */
  descriptionAr: string;
  /** Product status - only "active" products are shown */
  status: "active" | "inactive";
  /** Optional design theme for filtering */
  designTheme?: string;
  /** Optional search tags */
  tags?: string[];
  /** Discount percent (0-100) */
  discountPercent?: number;
  /** Stock mode for availability */
  stockMode?: "unlimited" | "limited";
  /** Stock quantity for limited inventory */
  stockQty?: number;
  /** Current available stock */
  stock?: number;
  /** Whether the product is available for purchase */
  inStock?: boolean;
};
