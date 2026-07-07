export type ProductCategory = "tshirts" | "pants" | "hoodies" | "accessories";
export type ProductStatus = "draft" | "active" | "archived";
export type ProductStockMode = "unlimited" | "limited" | "made_to_order";
export type ProductDropSlug = "drop-001";

export type ProductImage = {
  id: string;
  url: string;
  alt: string;
  publicId?: string;
  width?: number;
  height?: number;
  sortOrder?: number;
};

export type ProductColor = {
  id: string;
  name: string;
  value: string;
};

export type ProductSize = {
  id: string;
  label: string;
  stockQty?: number;
};

export type Run213Product = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  category: ProductCategory;
  status: ProductStatus;
  priceDzd: number;
  compareAtPriceDzd?: number | null;
  costPriceDzd?: number | null;
  images: ProductImage[];
  colors: ProductColor[];
  sizes: ProductSize[];
  stockMode: ProductStockMode;
  stockQty?: number;
  inStock: boolean;
  featured?: boolean;
  isPromo?: boolean;
  dropSlug?: ProductDropSlug;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type OrderPaymentMethod = "cash_on_delivery";
export type DeliveryMode = "home" | "office";

export type OrderCustomer = {
  fullName: string;
  phone: string;
  email?: string | null;
};

export type OrderAddress = {
  wilaya: string;
  commune?: string;
  address: string;
  deliveryMode: DeliveryMode;
  notes?: string | null;
};

export type OrderItem = {
  productId: string;
  slug: string;
  name: string;
  imageUrl?: string;
  colorId?: string;
  colorName?: string;
  sizeId?: string;
  sizeLabel?: string;
  quantity: number;
  unitPriceDzd: number;
  lineTotalDzd: number;
};

export type Run213Order = {
  id: string;
  status: OrderStatus;
  userId?: string | null;
  customerEmailNormalized?: string | null;
  customer: OrderCustomer;
  shippingAddress: OrderAddress;
  items: OrderItem[];
  subtotalDzd: number;
  shippingDzd: number;
  totalDzd: number;
  paymentMethod: OrderPaymentMethod;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminRole = "admin" | "super_admin";

export type AdminUser = {
  uid: string;
  email: string;
  role: AdminRole;
  createdAt?: string;
  updatedAt?: string;
};

export type FirebaseCollection =
  | "products"
  | "orders"
  | "users"
  | "favorites"
  | "wishlistSignups"
  | "contactMessages"
  | "communitySubmissions"
  | "adminStats"
  | "adminStatsDaily"
  | "settings";
