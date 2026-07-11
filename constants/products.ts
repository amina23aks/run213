import type { Product, ProductCardView } from "@/types/product";

const defaultDescription = "Built for daily movement. Soft, structured, and made for the runners who show up.";
const defaultDetails = ["Designed for daily wear", "Unisex active streetwear fit", "Comfort all day", "Made to move with you"];

export const shopProducts: Product[] = [
  createMockProduct({ slug: "oversized-tee", name: "Oversized Tee", category: "tshirts", priceDzd: 2900, image: "/tshirt.png", colors: [["Black", "#111111"], ["Cream", "#f6efe4"], ["Grey", "#8a8f75"]], sizes: ["S", "M", "L", "XL"], description: "Built for daily movement. Soft, structured, and made for the runners who show up.", details: ["Oversized fit", "Soft cotton feel", "Designed for daily wear", "213 RUN print", "Made for movement"], sortOrder: 10 }),
  createMockProduct({ slug: "regular-tee", name: "Regular Tee", category: "tshirts", priceDzd: 2400, image: "/tshirt.png", colors: [["Cream", "#f6efe4"], ["Black", "#111111"], ["Lime", "#c8ff00"]], sizes: ["S", "M", "L", "XL"], sortOrder: 20 }),
  createMockProduct({ slug: "wide-short", name: "Wide Short", category: "pants", priceDzd: 3500, image: "/buttom.png", colors: [["Black", "#111111"], ["Grey", "#6f7465"], ["Cream", "#d8d0c4"]], sizes: ["S", "M", "L", "XL"], sortOrder: 30 }),
  createMockProduct({ slug: "open-leg-pant", name: "Open Leg Pant", category: "pants", priceDzd: 3800, image: "/buttom.png", colors: [["Black", "#111111"], ["Grey", "#44443d"], ["Cream", "#f2eadc"]], sizes: ["S", "M", "L", "XL"], sortOrder: 40 }),
  createMockProduct({ slug: "baggy-jogger", name: "Baggy Jogger", category: "pants", priceDzd: 4200, image: "/buttom.png", colors: [["Black", "#111111"], ["Grey", "#3b3f37"], ["Cream", "#b8b0a2"]], sizes: ["S", "M", "L", "XL"], sortOrder: 50 }),
  createMockProduct({ slug: "zip-hoodie", name: "Zip Hoodie", category: "hoodies", priceDzd: 5900, compareAtPriceDzd: 6900, image: "/top.png", colors: [["Black", "#080808"], ["Cream", "#f0e6d8"]], sizes: ["S", "M", "L", "XL"], isPromo: true, sortOrder: 60 }),
  createMockProduct({ slug: "sweatshirt", name: "Sweatshirt", category: "hoodies", priceDzd: 3600, compareAtPriceDzd: 4000, image: "/tshirt.png", colors: [["Cream", "#f1e6d9"], ["Black", "#111111"], ["Grey", "#9c9488"]], sizes: ["S", "M", "L", "XL"], isPromo: true, sortOrder: 70 }),
  createMockProduct({ slug: "high-neck-zip-shirt", name: "High Neck Zip Shirt", category: "hoodies", priceDzd: 4200, compareAtPriceDzd: 4900, image: "/top.png", colors: [["Black", "#111111"], ["Cream", "#e8dfd2"]], sizes: ["S", "M", "L", "XL"], isPromo: true, sortOrder: 80 }),
  createMockProduct({ slug: "hat-neck-warmer-regular", name: "Hat / Neck Warmer Regular", category: "accessories", priceDzd: 1700, compareAtPriceDzd: 2000, image: "/accs.png", colors: [["Black", "#111111"], ["Cream", "#e8dfd2"]], isPromo: true, sortOrder: 90 }),
  createMockProduct({ slug: "backpack", name: "Backpack", category: "accessories", priceDzd: 4900, compareAtPriceDzd: 6000, image: "/accs.png", colors: [["Black", "#111111"], ["Grey", "#3d3d38"]], isPromo: true, sortOrder: 100 }),
];

export const shopFilters = ["All", "T-Shirts", "Hoodies", "Pants", "Accessories"];

export function getStaticProductBySlug(slug: string) {
  return shopProducts.find((product) => product.slug === slug);
}

export const relatedDropProducts = shopProducts.filter((product) => ["regular-tee", "open-leg-pant", "baggy-jogger", "zip-hoodie"].includes(product.slug));

export function formatDzd(priceDzd: number): string {
  return `${new Intl.NumberFormat("en-US").format(priceDzd)} DZD`;
}

export function toProductCardView(product: Product): ProductCardView {
  const oldPrice = product.compareAtPriceDzd ? formatDzd(product.compareAtPriceDzd) : undefined;
  const discount = product.compareAtPriceDzd ? `-${Math.round(((product.compareAtPriceDzd - product.priceDzd) / product.compareAtPriceDzd) * 100)}%` : undefined;

  return {
    name: product.name,
    price: formatDzd(product.priceDzd),
    image: product.images[0]?.url ?? "/placeholders/product-placeholder.webp",
    colors: product.colors.map((color) => color.hex),
    sizes: product.sizes.length ? product.sizes.map((size) => size.label) : undefined,
    oldPrice,
    discount,
  };
}

type MockProductInput = {
  slug: string;
  name: string;
  category: Product["category"];
  priceDzd: number;
  compareAtPriceDzd?: number;
  image: string;
  colors: [string, string][];
  sizes?: string[];
  description?: string;
  details?: string[];
  isPromo?: boolean;
  sortOrder: number;
};

function createMockProduct(input: MockProductInput): Product {
  return {
    id: input.slug,
    slug: input.slug,
    name: input.name,
    description: input.description ?? defaultDescription,
    details: input.details ?? defaultDetails,
    category: input.category,
    status: "active",
    basePriceDzd: input.compareAtPriceDzd ?? input.priceDzd,
    priceDzd: input.priceDzd,
    compareAtPriceDzd: input.compareAtPriceDzd ?? null,
    costPriceDzd: null,
    discountPercent: input.compareAtPriceDzd ? Math.round(((input.compareAtPriceDzd - input.priceDzd) / input.compareAtPriceDzd) * 100) : 0,
    images: [{ url: input.image, alt: `${input.name} product image` }],
    colors: input.colors.map(([name, hex]) => ({ name, hex })),
    sizes: input.sizes?.map((label) => ({ label })) ?? [],
    stockMode: "made_to_order",
    stockQty: null,
    inStock: true,
    featured: input.sortOrder <= 50,
    sizeGuideEnabled: false,
    sizeGuideImageUrl: null,
    sizeGuideImagePublicId: null,
    isPromo: input.isPromo ?? false,
    dropSlug: "drop-001",
    sortOrder: input.sortOrder,
    showInDrop001: input.sortOrder <= 50,
    showInFeaturedDrop: input.isPromo ?? false,
    showInShopTheLook: false,
    featuredSortOrder: input.isPromo ? input.sortOrder : null,
    lookGroupSlug: null,
    createdAt: null,
    updatedAt: null,
  };
}
