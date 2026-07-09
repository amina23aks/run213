"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

import { ProductForm, type ProductFormValues } from "./components/ProductForm";
import {
  createAdminProduct,
  deleteAdminProduct,
  listAdminProductsPage,
  updateAdminProduct,
  type AdminProduct,
  type AdminProductInput,
} from "@/lib/admin-products";
import {
  uploadImageToCloudinary,
  uploadImageToCloudinaryWithMetadata,
} from "@/lib/cloudinary";
import {
  CANONICAL_CATEGORY_SLUGS,
  CANONICAL_DESIGN_SLUGS,
  type SelectableItem,
} from "@/lib/categories-shared";
import type { SelectableOption } from "@/types/selectable";

type Toast = { type: "success" | "error"; message: string };

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const cloudinaryConfigured = Boolean(cloudName && uploadPreset);
const cloudinaryMissing = !cloudName && !uploadPreset;
const normalizeSlug = (value: string) => value.trim().toLowerCase();

const toSelectableCategoryOption = (item: SelectableItem): SelectableOption => {
  const slug = normalizeSlug(item.slug);
  return {
    id: item.id,
    name: item.label,
    slug,
    isDefault: CANONICAL_CATEGORY_SLUGS.includes(
      slug as (typeof CANONICAL_CATEGORY_SLUGS)[number],
    ),
  };
};

const toSelectableDesignOption = (item: SelectableItem): SelectableOption => {
  const slug = normalizeSlug(item.slug);
  return {
    id: item.id,
    name: item.label,
    slug,
    isDefault: CANONICAL_DESIGN_SLUGS.includes(
      slug as (typeof CANONICAL_DESIGN_SLUGS)[number],
    ),
  };
};

const allowedSizes = ["S", "M", "L", "XL", "XXL"] as const;
const ADMIN_PRODUCTS_PAGE_SIZE = 5;

const defaultForm: ProductFormValues = {
  name: "",
  description: "",
  basePrice: "",
  discountPercent: "0",
  costPrice: "",
  status: "active",
  featuredDrops: [],
  category: "", // Will be set from categories list
  designTheme: "simple",
  designThemeCustom: "",
  stockMode: "unlimited",
  stockQty: "",
  sizes: [],
  colors: [{ hex: "#000000" }],
  soldOutSizes: [],
  soldOutColorCodes: [],
  gender: "",
  images: [],
  sizeGuideEnabled: false,
  sizeGuideImageUrl: "",
  sizeGuideImagePublicId: "",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function buildImagesFromList(images: string[]): {
  main: string;
  gallery: string[];
} {
  const filtered = Array.from(
    new Set((images ?? []).map(String).filter(Boolean)),
  );
  const [main, ...gallery] = filtered;
  return { main: main ?? "", gallery };
}

function deriveStockState(product: AdminProduct) {
  const legacyQty =
    typeof product.stock === "number"
      ? product.stock
      : typeof product.stockQty === "number"
        ? product.stockQty
        : 0;
  const mode =
    product.stockMode ??
    (product.inStock === false
      ? "limited"
      : typeof product.stockQty === "number" ||
          typeof product.stock === "number"
        ? "limited"
        : "unlimited");
  if (mode === "limited") {
    return {
      stockMode: "limited" as const,
      stockQty: Math.max(Number(product.stockQty ?? legacyQty ?? 0), 0),
    };
  }
  return { stockMode: "unlimited" as const, stockQty: null };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [productsCursor, setProductsCursor] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingSizeGuide, setUploadingSizeGuide] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formInitial, setFormInitial] =
    useState<ProductFormValues>(defaultForm);
  const [formKey, setFormKey] = useState(() => Date.now());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const productsInfiniteScrollRef = useRef<HTMLDivElement | null>(null);
  const [categories, setCategories] = useState<SelectableOption[]>([]);
  const [designThemes, setDesignThemes] = useState<SelectableOption[]>([]);
  const derivedDesignThemes = useMemo(() => {
    const map = new Map<string, SelectableOption>();
    designThemes.forEach((theme) => {
      const slug = theme.slug.trim().toLowerCase();
      if (!slug) return;
      map.set(slug, { ...theme, slug });
    });
    products.forEach((product) => {
      const rawTheme =
        typeof product.designTheme === "string"
          ? product.designTheme.trim()
          : "";
      if (!rawTheme) return;
      const slug = rawTheme.toLowerCase();
      if (!map.has(slug)) {
        map.set(slug, {
          id: slug,
          slug,
          name: rawTheme,
          isDefault: slug === "simple",
        });
      }
    });
    if (!map.has("simple")) {
      map.set("simple", {
        id: "simple",
        slug: "simple",
        name: "Simple",
        isDefault: true,
      });
    }
    const sorted = Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const simpleIndex = sorted.findIndex((theme) => theme.slug === "simple");
    if (simpleIndex > 0) {
      const [simpleTheme] = sorted.splice(simpleIndex, 1);
      sorted.unshift(simpleTheme);
    }
    return sorted;
  }, [designThemes, products]);

  const coerceCollectionsAndDesigns = useCallback(
    (payload: { collections: SelectableItem[]; designs: SelectableItem[] }) =>
      payload,
    [],
  );

  const showToast = useCallback((payload: Toast) => {
    setToast(payload);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadCollectionsAndDesigns = useCallback(async () => {
    try {
      const res = await fetch("/api/categories", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = coerceCollectionsAndDesigns(await res.json());
      setCategories(data.collections.map(toSelectableCategoryOption));
      setDesignThemes(data.designs.map(toSelectableDesignOption));
    } catch (err) {
      console.error("Failed to load categories and designs", err);
    }
  }, [coerceCollectionsAndDesigns]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories?type=category", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch categories");
      const fetched = (await res.json()) as SelectableItem[];
      setCategories(fetched.map(toSelectableCategoryOption));
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  }, []);

  const loadDesignThemes = useCallback(async () => {
    try {
      const res = await fetch("/api/categories?type=design", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch design themes");
      const fetched = (await res.json()) as SelectableItem[];
      setDesignThemes(fetched.map(toSelectableDesignOption));
    } catch (err) {
      console.error("Failed to load design themes", err);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await listAdminProductsPage(ADMIN_PRODUCTS_PAGE_SIZE);
      setProducts(page.products);
      setProductsCursor(page.nextCursor);
      setHasMoreProducts(Boolean(page.nextCursor));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load products";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMoreProducts = useCallback(async () => {
    if (!productsCursor || loadingMoreProducts || !hasMoreProducts) return;
    setLoadingMoreProducts(true);
    setError(null);
    try {
      const page = await listAdminProductsPage(
        ADMIN_PRODUCTS_PAGE_SIZE,
        productsCursor,
      );
      setProducts((prev) => [...prev, ...page.products]);
      setProductsCursor(page.nextCursor);
      setHasMoreProducts(Boolean(page.nextCursor));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load more products";
      setError(message);
    } finally {
      setLoadingMoreProducts(false);
    }
  }, [hasMoreProducts, loadingMoreProducts, productsCursor]);

  useEffect(() => {
    const sentinel = productsInfiniteScrollRef.current;
    if (!sentinel || loading || loadingMoreProducts || !hasMoreProducts) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMoreProducts();
        }
      },
      { rootMargin: "300px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreProducts, loadMoreProducts, loading, loadingMoreProducts]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadCollectionsAndDesigns();
  }, [loadCollectionsAndDesigns]);

  useEffect(() => {
    if (!pendingDelete) return;
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPendingDelete(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pendingDelete]);

  const handleUploadImage = useCallback(
    async (file: File) => {
      if (!cloudinaryConfigured) {
        throw new Error(
          "Cloudinary is not configured. Save without an image or add credentials.",
        );
      }

      setUploadingImage(true);
      setError(null);
      try {
        const url = await uploadImageToCloudinary(file);
        showToast({ type: "success", message: "Image uploaded to Cloudinary" });
        return url;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to upload image";
        showToast({ type: "error", message });
        throw err;
      } finally {
        setUploadingImage(false);
      }
    },
    [showToast],
  );

  const handleUploadSizeGuide = useCallback(
    async (file: File) => {
      if (!cloudinaryConfigured) {
        throw new Error(
          "Cloudinary is not configured. Save without an image or add credentials.",
        );
      }

      setUploadingSizeGuide(true);
      setError(null);
      try {
        const result = await uploadImageToCloudinaryWithMetadata(file);
        showToast({
          type: "success",
          message: "Size guide uploaded to Cloudinary",
        });
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to upload size guide";
        showToast({ type: "error", message });
        throw err;
      } finally {
        setUploadingSizeGuide(false);
      }
    },
    [showToast],
  );

  const resetForm = useCallback(() => {
    setFormInitial(defaultForm);
    setFormKey(Date.now());
    setEditingId(null);
  }, []);

  const handleSubmit = useCallback(
    async (values: ProductFormValues) => {
      setSaving(true);
      setError(null);
      const designTheme = values.designTheme || "simple";
      const images = buildImagesFromList(values.images);
      const normalizedStockMode =
        values.stockMode === "limited" ? "limited" : "unlimited";
      const parsedStockQty =
        normalizedStockMode === "limited"
          ? Math.max(Number(values.stockQty || 0), 0)
          : undefined;
      const sizeGuideEnabled = Boolean(values.sizeGuideEnabled);
      const payload: AdminProductInput = {
        name: values.name.trim(),
        slug: slugify(values.name),
        basePrice: Number(values.basePrice || 0),
        discountPercent: Number(values.discountPercent || 0),
        finalPrice: Math.max(
          Number(values.basePrice || 0) *
            (1 - Number(values.discountPercent || 0) / 100),
          0,
        ),
        costPrice: Math.max(Number(values.costPrice || 0), 0),
        category: values.category,
        status: values.status,
        featuredDrops: values.featuredDrops,
        designTheme,
        sizes: values.sizes,
        colors: values.colors,
        sizeGuideEnabled,
        sizeGuideImageUrl:
          sizeGuideEnabled && values.sizeGuideImageUrl
            ? values.sizeGuideImageUrl
            : null,
        sizeGuideImagePublicId:
          sizeGuideEnabled && values.sizeGuideImagePublicId
            ? values.sizeGuideImagePublicId
            : null,
        soldOutSizes: values.soldOutSizes,
        soldOutColorCodes: values.soldOutColorCodes,
        images,
        stockMode: normalizedStockMode,
        stockQty: parsedStockQty,
        inStock:
          normalizedStockMode === "limited" ? (parsedStockQty ?? 0) > 0 : true,
      };

      // Only include description if it's explicitly set (not empty string)
      if (values.description && values.description.trim() !== "") {
        payload.description = values.description.trim();
      }

      // Only include gender if it's explicitly set (not empty string)
      if (values.gender && values.gender.trim() !== "") {
        const genderValue = values.gender.trim().toLowerCase();
        if (
          genderValue === "unisex" ||
          genderValue === "men" ||
          genderValue === "women"
        ) {
          payload.gender = genderValue;
        }
      }

      try {
        if (editingId) {
          await updateAdminProduct(editingId, payload);
          showToast({ type: "success", message: "Product updated" });
        } else {
          await createAdminProduct(payload);
          showToast({ type: "success", message: "Product created" });
        }
        resetForm();
        void loadProducts();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save product";
        setError(message);
        showToast({ type: "error", message });
      } finally {
        setSaving(false);
      }
    },
    [editingId, loadProducts, resetForm, showToast],
  );

  const handleDelete = useCallback((product: AdminProduct) => {
    setPendingDelete(product);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteAdminProduct(pendingDelete.id);
      showToast({ type: "success", message: "Product deleted" });
      setProducts((prev) =>
        prev.filter((product) => product.id !== pendingDelete.id),
      );
      if (editingId === pendingDelete.id) {
        resetForm();
      }
      setPendingDelete(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete product";
      setError(message);
      showToast({ type: "error", message });
    } finally {
      setIsDeleting(false);
    }
  }, [editingId, pendingDelete, resetForm, showToast]);

  const startEdit = useCallback((product: AdminProduct) => {
    setEditingId(product.id);

    const derivedStock = deriveStockState(product);
    setFormInitial({
      name: product.name,
      description: product.description ?? "",
      basePrice: product.basePrice?.toString() ?? "",
      discountPercent: product.discountPercent?.toString() ?? "0",
      costPrice: product.costPrice ? product.costPrice.toString() : "",
      category: product.category,
      status: product.status ?? "active",
      featuredDrops: product.featuredDrops ?? [],
      designTheme: product.designTheme || "simple",
      designThemeCustom: "",
      stockMode: derivedStock.stockMode,
      stockQty:
        derivedStock.stockMode === "limited"
          ? String(derivedStock.stockQty ?? 0)
          : "",
      sizes: (product.sizes || [])
        .map((size) => size.toUpperCase())
        .filter((size): size is (typeof allowedSizes)[number] =>
          allowedSizes.includes(size as (typeof allowedSizes)[number]),
        ),
      colors: product.colors,
      sizeGuideEnabled: product.sizeGuideEnabled ?? false,
      sizeGuideImageUrl: product.sizeGuideImageUrl ?? "",
      sizeGuideImagePublicId: product.sizeGuideImagePublicId ?? "",
      soldOutSizes: product.soldOutSizes ?? [],
      soldOutColorCodes: product.soldOutColorCodes ?? [],
      images: Array.from(
        new Set(
          [product.images.main, ...(product.images.gallery ?? [])].filter(
            Boolean,
          ),
        ),
      ),
      gender: product.gender ?? "",
    });
    setFormKey(Date.now());
  }, []);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-200">
          Products
        </p>
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">
          Admin products
        </h1>
        <p className="max-w-2xl text-sm text-sky-100/85 sm:text-base">
          Manage the catalog in real-time: upload imagery to Cloudinary, keep
          Firestore in sync, and export what you see.
        </p>
        <div className="hidden flex-wrap gap-3 md:flex">
          <a
            href="#product-form"
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Create product
          </a>
          <a
            href="#products-list"
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Manage / Edit products
          </a>
        </div>
      </div>

      {toast || error ? (
        <div className="space-y-3" aria-live="polite">
          {toast ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                toast.type === "success"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-50"
                  : "border-rose-500/50 bg-rose-500/10 text-rose-50"
              }`}
            >
              {toast.message}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-50">
              {error}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-6">
        <section
          id="products-list"
          className="admin-products-list-panel order-3 space-y-4 rounded-3xl border border-white/10 bg-white/10 p-4 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">
                Current products
              </p>
              <p className="text-xs text-sky-100/70">
                Compact list with quick edit/delete.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadProducts}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="hidden overflow-x-auto md:block">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-7 gap-3 border-b border-white/10 bg-white/5 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-100/70">
                  <span className="col-span-2">Product</span>
                  <span>Category</span>
                  <span>Price</span>
                  <span>Stock</span>
                  <span>Status</span>
                  <span>In stock?</span>
                  <span className="text-right">Actions</span>
                </div>
                {loading ? (
                  <ProductTableSkeleton />
                ) : products.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-sky-100/80">
                    No products yet. Add the first item using the form.
                  </div>
                ) : (
                  <ul className="divide-y divide-white/10">
                    {products.map((product) => {
                      const mainImage =
                        product.images.main || product.images.gallery[0];
                      const derivedStock = deriveStockState(product);
                      const isLimited = derivedStock.stockMode === "limited";
                      const stockCount = isLimited
                        ? (derivedStock.stockQty ?? 0)
                        : null;
                      const safeStockCount =
                        typeof stockCount === "number" ? stockCount : 0;
                      return (
                        <li
                          key={product.id}
                          className="grid grid-cols-7 items-center gap-3 px-4 py-3 text-sm text-sky-50"
                        >
                          <div className="col-span-2 flex items-center gap-3">
                            {mainImage ? (
                              <Image
                                src={mainImage}
                                alt={product.name}
                                width={48}
                                height={48}
                                className="h-12 w-12 rounded-xl object-cover ring-1 ring-white/20"
                              />
                            ) : (
                              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-white/20 text-[11px] text-sky-100/70">
                                No image
                              </span>
                            )}
                            <div className="space-y-1">
                              <p className="font-semibold text-white">
                                {product.name}
                              </p>
                              <p className="text-[11px] text-sky-100/70">
                                {product.designTheme}
                              </p>
                              <p className="font-mono text-[10px] text-sky-100/55">
                                ID: {product.id}
                              </p>
                              {(product.featuredDrops ?? []).includes(
                                "flow",
                              ) ? (
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
                                  FLOW drop
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <span className="text-xs uppercase text-sky-100/80">
                            {product.category}
                          </span>
                          <div className="space-y-1 text-sm">
                            <p className="font-semibold text-white">
                              {new Intl.NumberFormat("fr-DZ", {
                                style: "currency",
                                currency: "DZD",
                                maximumFractionDigits: 0,
                              }).format(
                                Math.max(
                                  product.finalPrice ?? product.basePrice,
                                  0,
                                ),
                              )}
                            </p>
                            {product.discountPercent > 0 ? (
                              <p className="text-[11px] text-sky-100/70">
                                Base{" "}
                                {new Intl.NumberFormat("fr-DZ", {
                                  style: "currency",
                                  currency: "DZD",
                                  maximumFractionDigits: 0,
                                }).format(product.basePrice)}{" "}
                                • -{product.discountPercent}%
                              </p>
                            ) : null}
                          </div>
                          <div className="space-y-1 text-sm">
                            {isLimited ? (
                              <p>{stockCount} pcs</p>
                            ) : (
                              <p>Unlimited</p>
                            )}
                          </div>
                          <div className="space-y-1 text-sm">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                product.status === "active"
                                  ? "bg-emerald-500/20 text-emerald-50 ring-1 ring-emerald-500/40"
                                  : "bg-amber-500/15 text-amber-50 ring-1 ring-amber-500/40"
                              }`}
                            >
                              {product.status === "active" ? "Active" : "Draft"}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                (isLimited ? safeStockCount > 0 : true)
                                  ? "bg-emerald-500/20 text-emerald-50 ring-1 ring-emerald-500/40"
                                  : "bg-rose-500/15 text-rose-50 ring-1 ring-rose-500/40"
                              }`}
                            >
                              {isLimited
                                ? safeStockCount > 0
                                  ? "Yes"
                                  : "No"
                                : "Yes"}
                            </span>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(product)}
                              className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(product)}
                              className="rounded-full bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-50 transition hover:bg-rose-500/30"
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
            {loading ? (
              <div className="space-y-3 p-3 md:hidden">
                {[...Array(3)].map((_, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-white/10 bg-white/10 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-14 w-14 rounded-xl bg-white/10" />
                      <div className="flex-1 space-y-2">
                        <span className="block h-3 w-2/3 rounded-full bg-white/10" />
                        <span className="block h-3 w-1/2 rounded-full bg-white/10" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="px-4 py-6 text-sm text-sky-100/80 md:hidden">
                No products yet. Add the first item using the form.
              </div>
            ) : (
              <ul className="grid gap-3 p-3 md:hidden">
                {products.map((product) => {
                  const mainImage =
                    product.images.main || product.images.gallery[0];
                  const derivedStock = deriveStockState(product);
                  const isLimited = derivedStock.stockMode === "limited";
                  const stockCount = isLimited
                    ? (derivedStock.stockQty ?? 0)
                    : null;
                  const safeStockCount =
                    typeof stockCount === "number" ? stockCount : 0;

                  return (
                    <li
                      key={product.id}
                      className="space-y-3 rounded-2xl border border-white/10 bg-white/10 p-3 text-sm text-sky-50"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        {mainImage ? (
                          <Image
                            src={mainImage}
                            alt={product.name}
                            width={56}
                            height={56}
                            className="h-14 w-14 flex-none rounded-xl object-cover ring-1 ring-white/20"
                          />
                        ) : (
                          <span className="flex h-14 w-14 flex-none items-center justify-center rounded-xl border border-dashed border-white/20 text-[11px] text-sky-100/70">
                            No image
                          </span>
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="break-words font-semibold text-white">
                            {product.name}
                          </p>
                          <p className="text-[11px] text-sky-100/70">
                            {product.designTheme}
                          </p>
                          <p className="font-mono text-[10px] text-sky-100/55">
                            ID: {product.id}
                          </p>
                          {(product.featuredDrops ?? []).includes("flow") ? (
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
                              FLOW drop
                            </p>
                          ) : null}
                          <p className="break-words text-xs uppercase text-sky-100/80">
                            {product.category}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-950/25 p-3 text-xs text-sky-100/80">
                        <div>
                          <p className="uppercase tracking-[0.16em] text-sky-200/70">
                            Price
                          </p>
                          <p className="mt-1 font-semibold text-white">
                            {new Intl.NumberFormat("fr-DZ", {
                              style: "currency",
                              currency: "DZD",
                              maximumFractionDigits: 0,
                            }).format(
                              Math.max(
                                product.finalPrice ?? product.basePrice,
                                0,
                              ),
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="uppercase tracking-[0.16em] text-sky-200/70">
                            Stock
                          </p>
                          <p className="mt-1 font-semibold text-white">
                            {isLimited ? `${stockCount} pcs` : "Unlimited"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              product.status === "active"
                                ? "bg-emerald-500/20 text-emerald-50 ring-1 ring-emerald-500/40"
                                : "bg-amber-500/15 text-amber-50 ring-1 ring-amber-500/40"
                            }`}
                          >
                            {product.status === "active" ? "Active" : "Draft"}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              (isLimited ? safeStockCount > 0 : true)
                                ? "bg-emerald-500/20 text-emerald-50 ring-1 ring-emerald-500/40"
                                : "bg-rose-500/15 text-rose-50 ring-1 ring-rose-500/40"
                            }`}
                          >
                            {isLimited
                              ? safeStockCount > 0
                                ? "In stock"
                                : "Out of stock"
                              : "In stock"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(product)}
                            className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product)}
                            className="rounded-full bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-50 transition hover:bg-rose-500/30"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div
            ref={productsInfiniteScrollRef}
            className="h-4"
            aria-hidden="true"
          />
          {loadingMoreProducts ? (
            <p className="pt-4 text-center text-sm text-sky-100/70">
              Loading more products...
            </p>
          ) : null}
        </section>

        <section
          id="product-form"
          className="admin-products-form-panel order-2 rounded-3xl border border-white/10 bg-white/10 p-4 sm:p-6"
        >
          <ProductForm
            key={formKey}
            mode={editingId ? "edit" : "create"}
            heading="Create / Edit product"
            subheading={
              editingId
                ? "You are editing an existing product"
                : "Add a new product"
            }
            submitLabel={editingId ? "Save changes" : "Add product"}
            initialValues={formInitial}
            loading={saving}
            uploading={uploadingImage}
            uploadingSizeGuide={uploadingSizeGuide}
            cloudinaryConfigured={cloudinaryConfigured}
            cloudinaryMissing={cloudinaryMissing}
            onSubmit={handleSubmit}
            onUploadImage={handleUploadImage}
            onUploadSizeGuide={handleUploadSizeGuide}
            onCancelEdit={resetForm}
            categories={categories}
            designThemes={derivedDesignThemes}
            onCategoriesChange={setCategories}
            onDesignThemesChange={setDesignThemes}
            onReloadCategories={loadCategories}
            onReloadDesignThemes={loadDesignThemes}
          />
        </section>
      </div>

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#082f55]/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-product-title"
          onClick={() => {
            if (!isDeleting) {
              setPendingDelete(null);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-[#082f55]/95 p-6 text-sky-50 shadow-lg shadow-black/25"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-2">
              <h2
                id="delete-product-title"
                className="text-xl font-semibold text-white"
              >
                Delete product?
              </h2>
              <p className="text-sm text-sky-100/80">This cannot be undone.</p>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                ref={cancelButtonRef}
                type="button"
                disabled={isDeleting}
                onClick={() => setPendingDelete(null)}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="rounded-full border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-50 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProductTableSkeleton() {
  return (
    <div className="divide-y divide-white/10">
      {[...Array(4)].map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-7 items-center gap-3 px-4 py-4 text-sm text-sky-100/70"
        >
          <div className="col-span-2 flex items-center gap-3">
            <span className="h-12 w-12 rounded-xl bg-white/10" />
            <div className="space-y-2">
              <span className="block h-3 w-32 rounded-full bg-white/10" />
              <span className="block h-3 w-40 rounded-full bg-white/10" />
            </div>
          </div>
          <span className="block h-3 w-16 rounded-full bg-white/10" />
          <span className="block h-3 w-20 rounded-full bg-white/10" />
          <span className="block h-3 w-10 rounded-full bg-white/10" />
          <div className="flex justify-end gap-2">
            <span className="block h-8 w-14 rounded-full bg-white/10" />
            <span className="block h-8 w-14 rounded-full bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
