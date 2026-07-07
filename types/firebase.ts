export type FirebaseTimestampValue = Date | string;

export type ProductCategory = "tshirts" | "pants" | "hoodies" | "accessories";

export type ProductStatus = "draft" | "active" | "archived";

export type ProductStockMode = "unlimited" | "limited" | "made_to_order";

export type ProductDropSlug = "drop-001";

export type ProductImage = {
  id: string;
  url: string;
  alt: string;
  width?: number;
  height?: number;
  position?: number;
};

export type ProductColor = {
  name: string;
  value: string;
  slug: string;
};

export type ProductSize = {
  label: string;
  value: string;
  inStock?: boolean;
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
  createdAt?: FirebaseTimestampValue;
  updatedAt?: FirebaseTimestampValue;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentMethod = "cash_on_delivery";

export type DeliveryMode = "home" | "desk";

export type OrderItem = {
  productId: string;
  productSlug: string;
  productName: string;
  imageUrl?: string;
  color?: ProductColor;
  size?: ProductSize;
  quantity: number;
  unitPriceDzd: number;
  lineTotalDzd: number;
};

export type OrderCustomer = {
  fullName: string;
  phone: string;
  email?: string | null;
};

export type OrderShippingAddress = {
  wilayaCode: string;
  wilayaName: string;
  deliveryMode: DeliveryMode;
  address: string;
  notes?: string | null;
};

export type Run213Order = {
  id: string;
  status: OrderStatus;
  userId?: string | null;
  customer: OrderCustomer;
  shippingAddress: OrderShippingAddress;
  items: OrderItem[];
  subtotalDzd: number;
  shippingDzd: number;
  totalDzd: number;
  paymentMethod: PaymentMethod;
  idempotencyKey?: string;
  createdAt?: FirebaseTimestampValue;
  updatedAt?: FirebaseTimestampValue;
};

export type AdminRole = "admin" | "super_admin";

export type AdminProfile = {
  uid: string;
  email: string;
  role: AdminRole;
  displayName?: string | null;
  createdAt?: FirebaseTimestampValue;
  updatedAt?: FirebaseTimestampValue;
};

export type FirestoreCollection =
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
