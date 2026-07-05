export type StaticProduct = {
  slug: string;
  name: string;
  price: string;
  image: string;
  colors: string[];
  colorNames: string[];
  sizes?: string[];
  description?: string;
  details?: string[];
};

export const shopProducts: StaticProduct[] = [
  { slug: "oversized-tee", name: "Oversized Tee", price: "2,900 DZD", image: "/tshirt.png", colors: ["#111111", "#f6efe4", "#8a8f75"], colorNames: ["Black", "Cream", "Grey"], sizes: ["S", "M", "L", "XL"], description: "Built for daily movement. Soft, structured, and made for the runners who show up.", details: ["Oversized fit", "Soft cotton feel", "Designed for daily wear", "213 RUN print", "Made for movement"] },
  { slug: "regular-tee", name: "Regular Tee", price: "2,400 DZD", image: "/tshirt.png", colors: ["#f6efe4", "#111111", "#c8ff00"], colorNames: ["Cream", "Black", "Lime"], sizes: ["S", "M", "L", "XL"] },
  { slug: "wide-short", name: "Wide Short", price: "3,500 DZD", image: "/buttom.png", colors: ["#111111", "#6f7465", "#d8d0c4"], colorNames: ["Black", "Grey", "Cream"], sizes: ["S", "M", "L", "XL"] },
  { slug: "open-leg-pant", name: "Open Leg Pant", price: "3,800 DZD", image: "/buttom.png", colors: ["#111111", "#44443d", "#f2eadc"], colorNames: ["Black", "Grey", "Cream"], sizes: ["S", "M", "L", "XL"] },
  { slug: "baggy-jogger", name: "Baggy Jogger", price: "4,200 DZD", image: "/buttom.png", colors: ["#111111", "#3b3f37", "#b8b0a2"], colorNames: ["Black", "Grey", "Cream"], sizes: ["S", "M", "L", "XL"] },
  { slug: "zip-hoodie", name: "Zip Hoodie", price: "5,900 DZD", image: "/top.png", colors: ["#080808", "#f0e6d8"], colorNames: ["Black", "Cream"], sizes: ["S", "M", "L", "XL"] },
  { slug: "sweatshirt", name: "Sweatshirt", price: "3,600 DZD", image: "/tshirt.png", colors: ["#f1e6d9", "#111111", "#9c9488"], colorNames: ["Cream", "Black", "Grey"], sizes: ["S", "M", "L", "XL"] },
  { slug: "high-neck-zip-shirt", name: "High Neck Zip Shirt", price: "4,200 DZD", image: "/top.png", colors: ["#111111", "#e8dfd2"], colorNames: ["Black", "Cream"], sizes: ["S", "M", "L", "XL"] },
  { slug: "hat-neck-warmer-regular", name: "Hat / Neck Warmer Regular", price: "1,700 DZD", image: "/accs.png", colors: ["#111111", "#e8dfd2"], colorNames: ["Black", "Cream"] },
  { slug: "backpack", name: "Backpack", price: "4,900 DZD", image: "/accs.png", colors: ["#111111", "#3d3d38"], colorNames: ["Black", "Grey"] },
];

export const shopFilters = ["All", "T-Shirts", "Hoodies", "Pants", "Shorts", "Accessories"];

export function getProductBySlug(slug: string) {
  return shopProducts.find((product) => product.slug === slug);
}

export const relatedDropProducts = shopProducts.filter((product) => ["regular-tee", "open-leg-pant", "baggy-jogger", "zip-hoodie"].includes(product.slug));
