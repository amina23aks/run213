"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

import { useAuth } from "@/context/auth";
import type { AdminProductCategory } from "@/lib/admin-products";
import type { SelectableOption } from "@/types/selectable";

export type ProductFormValues = {
  name: string;
  description: string;
  basePrice: string;
  discountPercent: string;
  costPrice: string;
  status: "active" | "inactive";
  featuredDrops: string[];
  category: AdminProductCategory;
  designTheme: string;
  designThemeCustom: string;
  stockMode: "unlimited" | "limited";
  stockQty: string;
  sizes: ("S" | "M" | "L" | "XL" | "XXL")[];
  colors: { hex: string }[];
  soldOutSizes: string[];
  soldOutColorCodes: string[];
  gender?: "unisex" | "men" | "women" | "";
  images: string[];
  sizeGuideEnabled: boolean;
  sizeGuideImageUrl: string;
  sizeGuideImagePublicId: string;
};

type ProductFormProps = {
  mode: "create" | "edit";
  heading: string;
  subheading?: string;
  submitLabel: string;
  initialValues?: Partial<ProductFormValues>;
  loading?: boolean;
  uploading?: boolean;
  uploadingSizeGuide?: boolean;
  cloudinaryConfigured: boolean;
  cloudinaryMissing: boolean;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onUploadImage: (file: File) => Promise<string>;
  onUploadSizeGuide: (
    file: File,
  ) => Promise<{ url: string; publicId: string | null }>;
  onCancelEdit?: () => void;
  categories: SelectableOption[];
  designThemes: SelectableOption[];
  onCategoriesChange: (next: SelectableOption[]) => void;
  onDesignThemesChange: (next: SelectableOption[]) => void;
  onReloadCategories: () => Promise<void>;
  onReloadDesignThemes: () => Promise<void>;
};

const normalizeColors = (
  input: unknown,
  fallback: ProductFormValues["colors"],
): ProductFormValues["colors"] => {
  if (!Array.isArray(input)) return fallback;

  const normalized = input.reduce<ProductFormValues["colors"]>((acc, item) => {
    if (typeof item === "string" && item.trim()) {
      acc.push({ hex: item.trim() });
      return acc;
    }

    if (item && typeof item === "object") {
      const obj = item as { hex?: unknown; id?: unknown };
      const hex =
        (typeof obj.hex === "string" && obj.hex.trim()) ||
        (typeof obj.id === "string" && obj.id.trim()) ||
        null;
      if (hex) {
        acc.push({ hex });
      }
    }

    return acc;
  }, []);

  if (normalized.length > 0) return normalized;
  if (input.length === 0) return [];
  return fallback;
};

const normalizeImages = (images: unknown): string[] => {
  if (!Array.isArray(images)) return [];
  return Array.from(new Set(images.map(String).filter(Boolean)));
};

const normalizeStringArray = (
  input: unknown,
  fallback: string[] = [],
): string[] => {
  if (!input) return fallback;
  if (Array.isArray(input)) {
    const normalized = input
      .map((item) =>
        typeof item === "string" ? item.trim() : String(item).trim(),
      )
      .filter(Boolean);
    return Array.from(new Set(normalized));
  }
  if (typeof input === "string") {
    const normalized = input
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    return Array.from(new Set(normalized));
  }
  return fallback;
};

const normalizeHexValue = (value: string): string => value.trim().toLowerCase();

const normalizeHexArray = (
  input: unknown,
  fallback: string[] = [],
): string[] => {
  const normalized = normalizeStringArray(input, fallback).map((entry) =>
    normalizeHexValue(entry),
  );
  return Array.from(new Set(normalized));
};

const defaultValues: ProductFormValues = {
  name: "",
  description: "",
  basePrice: "",
  discountPercent: "0",
  costPrice: "",
  status: "active",
  featuredDrops: [],
  category: "hoodies",
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

const currencyFormatter = new Intl.NumberFormat("fr-DZ", {
  style: "currency",
  currency: "DZD",
  maximumFractionDigits: 0,
});

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "";

const mergeSelectables = (
  base: { slug: string; name: string; isDefault?: boolean; id?: string }[],
  extra: { slug: string; name: string; isDefault?: boolean; id?: string }[],
) => {
  const map = new Map<
    string,
    { slug: string; name: string; isDefault?: boolean; id?: string }
  >();
  base.forEach((item) => map.set(item.slug, item));
  extra.forEach((item) =>
    map.set(item.slug, { ...item, isDefault: map.get(item.slug)?.isDefault }),
  );
  return Array.from(map.values());
};

function clampDiscount(value: number | null) {
  if (value === null || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 90) return 90;
  return value;
}

function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const data = payload as { error?: unknown; message?: unknown };
    if (typeof data.message === "string" && data.message.trim())
      return data.message;
    if (typeof data.error === "string" && data.error.trim()) return data.error;
  }
  return fallback;
}

async function persistSelectable(
  name: string,
  type: "category" | "design",
  token: string,
) {
  const response = await fetch("/api/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, type }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(getApiErrorMessage(data, "Unable to save entry"));
  }
}

function getDiscountPreview(
  basePrice: number | null,
  discountPercent: number | null,
  costPrice: number | null,
) {
  const base = Number.isFinite(basePrice ?? NaN) ? (basePrice as number) : null;
  const discount = clampDiscount(discountPercent);
  if (base === null) {
    return {
      label: "Enter a base price to preview",
      discountedPrice: null,
      profit: null,
      margin: null,
    };
  }
  if (!discount) {
    return {
      label: `${currencyFormatter.format(base)} — no discount applied`,
      discountedPrice: base,
      profit: costPrice !== null ? base - Math.max(costPrice, 0) : null,
      margin:
        base > 0 && costPrice !== null
          ? ((base - Math.max(costPrice, 0)) / base) * 100
          : null,
    };
  }
  const discounted = Math.max(base * (1 - discount / 100), 0);
  return {
    label: `${currencyFormatter.format(base)} → ${currencyFormatter.format(discounted)} (-${discount}%)`,
    discountedPrice: discounted,
    profit: costPrice !== null ? discounted - Math.max(costPrice, 0) : null,
    margin:
      discounted > 0 && costPrice !== null
        ? ((discounted - Math.max(costPrice, 0)) / discounted) * 100
        : null,
  };
}

export function ProductForm({
  mode,
  heading,
  subheading,
  submitLabel,
  initialValues,
  loading,
  uploading,
  uploadingSizeGuide,
  cloudinaryConfigured,
  cloudinaryMissing,
  onSubmit,
  onUploadImage,
  onUploadSizeGuide,
  onCancelEdit,
  categories,
  designThemes,
  onCategoriesChange,
  onDesignThemesChange,
  onReloadCategories,
  onReloadDesignThemes,
}: ProductFormProps) {
  const { user } = useAuth();
  const initialColors = normalizeColors(
    initialValues?.colors,
    defaultValues.colors,
  );
  const initialImages = normalizeImages(
    initialValues?.images ?? defaultValues.images,
  );
  const [values, setValues] = useState<ProductFormValues>({
    ...defaultValues,
    ...initialValues,
    colors: initialColors,
    images: initialImages,
    featuredDrops: normalizeStringArray(
      initialValues?.featuredDrops,
      defaultValues.featuredDrops,
    ),
    soldOutSizes: normalizeStringArray(
      initialValues?.soldOutSizes,
      defaultValues.soldOutSizes,
    ).map((size) => size.toUpperCase()),
    soldOutColorCodes: normalizeHexArray(
      initialValues?.soldOutColorCodes,
      defaultValues.soldOutColorCodes,
    ),
  });
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [designThemeOptions, setDesignThemeOptions] = useState<
    SelectableOption[]
  >(() => {
    const initial = initialValues?.designTheme
      ? [
          {
            slug: initialValues.designTheme,
            name: capitalize(initialValues.designTheme),
          },
        ]
      : [];
    return mergeSelectables(
      designThemes,
      initialValues?.designTheme ? initial : [],
    );
  });
  const [isDeletingCategory, setIsDeletingCategory] = useState<string | null>(
    null,
  );
  const [isDeletingDesign, setIsDeletingDesign] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    type: "category" | "design";
    item: SelectableOption;
  } | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newDesignName, setNewDesignName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewDesign, setShowNewDesign] = useState(false);

  const getAdminMutationToken = useCallback(async () => {
    const token = await user?.getIdToken(true);
    if (!token) {
      throw new Error(
        "Admin authentication is required to manage categories and designs.",
      );
    }
    return token;
  }, [user]);

  const syncDesignThemes = useCallback(
    (next: SelectableOption[]) => {
      setDesignThemeOptions(next);
      onDesignThemesChange(next);
    },
    [onDesignThemesChange],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setValues((prev) => ({
      ...prev,
      ...initialValues,
      colors: normalizeColors(initialValues?.colors, prev.colors),
      images: normalizeImages(initialValues?.images ?? prev.images),
      featuredDrops: normalizeStringArray(
        initialValues?.featuredDrops,
        prev.featuredDrops,
      ),
      soldOutSizes: normalizeStringArray(
        initialValues?.soldOutSizes,
        prev.soldOutSizes,
      ).map((size) => size.toUpperCase()),
      soldOutColorCodes: normalizeHexArray(
        initialValues?.soldOutColorCodes,
        prev.soldOutColorCodes,
      ),
    }));
  }, [initialValues]);

  useEffect(() => {
    if (!values.category && categories.length > 0) {
      setValues((prev) => ({
        ...prev,
        category:
          prev.category || categories[0]?.slug || defaultValues.category,
      }));
      return;
    }
    if (!categories.some((cat) => cat.slug === values.category)) {
      const fallback = categories[0]?.slug ?? defaultValues.category;
      setValues((prev) => ({ ...prev, category: fallback }));
    }
  }, [categories, values.category]);

  useEffect(() => {
    const initial = values.designTheme
      ? [
          {
            slug: values.designTheme,
            name: capitalize(values.designTheme),
            isDefault: false,
          },
        ]
      : [];
    const merged = mergeSelectables(designThemes, initial);
    setDesignThemeOptions(merged);
    if (!merged.some((theme) => theme.slug === values.designTheme)) {
      setValues((prev) => ({
        ...prev,
        designTheme: merged[0]?.slug ?? "simple",
      }));
    }
  }, [designThemes, values.designTheme]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (values.sizeGuideEnabled && !values.sizeGuideImageUrl) {
        setError("Upload a size guide image before saving.");
        setIsSubmitting(false);
        return;
      }
      const normalizedColors = values.colors
        .map((color) => ({ hex: color.hex.trim() }))
        .filter((color) => Boolean(color.hex));
      const sizeSet = new Set(
        values.sizes.map((size) => size.trim().toUpperCase()),
      );
      const normalizedSoldOutSizes = normalizeStringArray(values.soldOutSizes)
        .map((size) => size.toUpperCase())
        .filter((size) => sizeSet.has(size));
      const colorHexSet = new Set(
        normalizedColors.map((color) => normalizeHexValue(color.hex)),
      );
      const normalizedSoldOutColorCodes = normalizeHexArray(
        values.soldOutColorCodes,
      ).filter((hex) => colorHexSet.has(hex));

      await onSubmit({
        ...values,
        colors: normalizedColors,
        soldOutSizes: normalizedSoldOutSizes,
        soldOutColorCodes: normalizedSoldOutColorCodes,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save product";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (cloudinaryMissing) {
      setError(
        "Cloudinary is not configured. Save without images or add config.",
      );
      return;
    }

    setError(null);
    try {
      const imageUrl = await onUploadImage(file);
      setValues((prev) => ({
        ...prev,
        images: normalizeImages([...prev.images, imageUrl]),
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Image upload failed";
      setError(message);
    }
  };

  const handleSizeGuideChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (cloudinaryMissing) {
      setError(
        "Cloudinary is not configured. Save without images or add config.",
      );
      return;
    }

    setError(null);
    try {
      const result = await onUploadSizeGuide(file);
      setValues((prev) => ({
        ...prev,
        sizeGuideEnabled: true,
        sizeGuideImageUrl: result.url,
        sizeGuideImagePublicId: result.publicId ?? "",
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Size guide upload failed";
      setError(message);
    }
  };

  const toggleSoldOutSize = (size: string) => {
    const normalized = size.toUpperCase();
    setValues((prev) => {
      const isSoldOut = prev.soldOutSizes.some(
        (entry) => entry.toUpperCase() === normalized,
      );
      const filtered = prev.soldOutSizes.filter(
        (entry) => entry.toUpperCase() !== normalized,
      );
      return {
        ...prev,
        soldOutSizes: isSoldOut ? filtered : [...filtered, normalized],
      };
    });
  };

  const toggleSoldOutColor = (hex: string) => {
    const normalized = normalizeHexValue(hex);
    if (!normalized) return;
    setValues((prev) => {
      const hasEntry = prev.soldOutColorCodes.some(
        (entry) => normalizeHexValue(entry) === normalized,
      );
      const filtered = prev.soldOutColorCodes.filter(
        (entry) => normalizeHexValue(entry) !== normalized,
      );
      return {
        ...prev,
        soldOutColorCodes: hasEntry ? filtered : [...filtered, normalized],
      };
    });
  };

  const computedSlug = useMemo(
    () =>
      values.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-"),
    [values.name],
  );

  const preview = useMemo(() => {
    const base = Number(values.basePrice || "");
    const discount = Number(values.discountPercent || "");
    const cost = values.costPrice === "" ? null : Number(values.costPrice);
    return getDiscountPreview(
      Number.isFinite(base) ? base : null,
      Number.isFinite(discount) ? discount : null,
      cost !== null && Number.isFinite(cost) ? cost : null,
    );
  }, [values.basePrice, values.discountPercent, values.costPrice]);

  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    const slug = slugify(trimmed);
    if (!slug) return;
    try {
      const token = await getAdminMutationToken();
      await persistSelectable(capitalize(trimmed), "category", token);
      const next = mergeSelectables(categories, [
        { slug, name: capitalize(trimmed), id: slug, isDefault: false },
      ]);
      onCategoriesChange(next);
      setValues((prev) => ({ ...prev, category: slug }));
      await onReloadCategories();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add category";
      console.error("Failed to add category", err);
      setError(message);
    } finally {
      setNewCategoryName("");
      setShowNewCategory(false);
    }
  };

  const handleAddDesign = async () => {
    const trimmed = newDesignName.trim();
    const slug = slugify(trimmed);
    if (!slug) return;
    try {
      const token = await getAdminMutationToken();
      await persistSelectable(capitalize(trimmed), "design", token);
      const next = mergeSelectables(designThemeOptions, [
        { slug, name: capitalize(trimmed), id: slug, isDefault: false },
      ]);
      syncDesignThemes(next);
      setValues((prev) => ({
        ...prev,
        designTheme: slug,
        designThemeCustom: slug,
      }));
      await onReloadDesignThemes();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add design";
      console.error("Failed to add design", err);
      setError(message);
    } finally {
      setNewDesignName("");
      setShowNewDesign(false);
    }
  };

  const performDeleteCategory = useCallback(
    async (category: SelectableOption) => {
      const slug = category.slug;
      setIsDeletingCategory(slug);
      try {
        const token = await getAdminMutationToken();
        const response = await fetch(
          `/api/categories?slug=${encodeURIComponent(slug)}&type=category`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(
            getApiErrorMessage(data, "Failed to delete category"),
          );
        }
        const next = categories.filter((cat) => cat.slug !== slug);
        onCategoriesChange(next);
        setValues((prev) => ({
          ...prev,
          category:
            prev.category === slug
              ? (next[0]?.slug ?? defaultValues.category)
              : prev.category,
        }));
        await onReloadCategories();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete category";
        console.error("Failed to delete category", err);
        setError(message);
      } finally {
        setIsDeletingCategory(null);
      }
    },
    [categories, getAdminMutationToken, onCategoriesChange, onReloadCategories],
  );

  const performDeleteDesign = useCallback(
    async (design: SelectableOption) => {
      const slug = design.slug;
      setIsDeletingDesign(slug);
      try {
        const token = await getAdminMutationToken();
        const response = await fetch(
          `/api/categories?slug=${encodeURIComponent(slug)}&type=design`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(getApiErrorMessage(data, "Failed to delete design"));
        }
        const next = designThemeOptions.filter((theme) => theme.slug !== slug);
        syncDesignThemes(next);
        setValues((prev) => ({
          ...prev,
          designTheme:
            prev.designTheme === slug
              ? (next[0]?.slug ?? "simple")
              : prev.designTheme,
        }));
        await onReloadDesignThemes();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete design";
        console.error("Failed to delete design", err);
        setError(message);
      } finally {
        setIsDeletingDesign(null);
      }
    },
    [
      designThemeOptions,
      getAdminMutationToken,
      onReloadDesignThemes,
      syncDesignThemes,
    ],
  );

  const requestDeleteCategory = useCallback((category: SelectableOption) => {
    if (category.isDefault) return;
    setPendingDelete({ type: "category", item: category });
  }, []);

  const requestDeleteDesign = useCallback((design: SelectableOption) => {
    if (design.isDefault) return;
    setPendingDelete({ type: "design", item: design });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;

    try {
      if (pendingDelete.type === "category") {
        await performDeleteCategory(pendingDelete.item);
      } else {
        await performDeleteDesign(pendingDelete.item);
      }
    } finally {
      setPendingDelete(null);
    }
  }, [pendingDelete, performDeleteCategory, performDeleteDesign]);

  const deletingSlug = isDeletingCategory ?? isDeletingDesign;

  return (
    <>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-200">
              {heading}
            </p>
            <h2 className="text-xl font-semibold text-white">
              {subheading ?? heading}
            </h2>
            <p className="max-w-3xl text-xs text-sky-100/80">
              Use the compact editor to create or update products. Unsaved image
              uploads stay local until you save.
            </p>
          </div>
          {mode === "edit" && onCancelEdit ? (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-sky-100/90">
            <span className="font-semibold text-white">Product name</span>
            <input
              required
              value={values.name}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white shadow-inner shadow-sky-900/40 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
              placeholder="Essential hoodie"
            />
            <span className="text-[11px] text-sky-100/70">
              Slug preview: {computedSlug || "—"}
            </span>
          </label>

          <label className="space-y-2 text-sm text-sky-100/90 md:col-span-2">
            <span className="font-semibold text-white">
              Description (optional)
            </span>
            <textarea
              value={values.description}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white shadow-inner shadow-sky-900/40 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/40 resize-none"
              placeholder="Enter product description..."
            />
          </label>

          <div className="space-y-2 text-sm text-sky-100/90 md:col-span-2">
            <span className="font-semibold text-white">Visibility</span>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "active", label: "Active / visible on site" },
                  { value: "inactive", label: "Draft / hidden from site" },
                ] as const
              ).map((option) => {
                const isSelected = values.status === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setValues((prev) => ({ ...prev, status: option.value }))
                    }
                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                      isSelected
                        ? "border-white bg-white text-slate-900"
                        : "border-white/20 bg-white/5 text-white/80 hover:border-white/40"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-sky-100/70">
              Draft products stay in admin but are hidden from /shop and
              homepage featured drops.
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-sky-100/90 shadow-inner shadow-sky-900/30 md:col-span-2">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-white/40 bg-white/5 text-emerald-400 focus:ring-2 focus:ring-white/40"
              checked={values.featuredDrops.includes("flow")}
              onChange={(event) => {
                setValues((prev) => {
                  const withoutFlow = prev.featuredDrops.filter(
                    (slug) => slug !== "flow",
                  );
                  return {
                    ...prev,
                    featuredDrops: event.target.checked
                      ? [...withoutFlow, "flow"]
                      : withoutFlow,
                  };
                });
              }}
            />
            <span className="space-y-1">
              <span className="block font-semibold text-white">
                Show in FLOW — DROP 01
              </span>
              <span className="block text-xs text-sky-100/70">
                Only active products checked here appear in the homepage FLOW
                featured drop.
              </span>
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-sky-900/30">
            <label className="space-y-2 text-sm text-sky-100/90">
              <span className="font-semibold text-white">Base price (DZD)</span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={values.basePrice}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, basePrice: e.target.value }))
                }
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white shadow-inner shadow-sky-900/30 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
                placeholder="3200"
              />
            </label>
            <label className="space-y-2 text-sm text-sky-100/90">
              <span className="font-semibold text-white">Discount %</span>
              <input
                type="number"
                min="0"
                max="100"
                inputMode="decimal"
                value={values.discountPercent}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    discountPercent: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white shadow-inner shadow-sky-900/30 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
                placeholder="0"
              />
            </label>
            <label className="space-y-2 text-sm text-sky-100/90">
              <span className="font-semibold text-white">Cost price (DZD)</span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={values.costPrice}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, costPrice: e.target.value }))
                }
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white shadow-inner shadow-sky-900/30 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
                placeholder="0"
              />
            </label>
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[12px] text-sky-100/80">
              <div className="flex items-center justify-between gap-3">
                <span>Selling price after discount</span>
                <span className="font-semibold text-white text-right">
                  {preview.label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Estimated profit per item</span>
                <span className="font-semibold text-white text-right">
                  {preview.profit === null
                    ? "Add cost price"
                    : currencyFormatter.format(preview.profit)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Estimated profit margin</span>
                <span className="font-semibold text-white text-right">
                  {preview.margin === null
                    ? "—"
                    : `${preview.margin.toFixed(1)}%`}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm text-sky-100/90">
            <span className="font-semibold text-white">Category</span>
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => {
                const isSelected = values.category === cat.slug;
                const key = cat.id ? `cat-${cat.id}` : `default-${cat.slug}`;
                return (
                  <div key={key} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setValues((prev) => ({ ...prev, category: cat.slug }))
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        isSelected
                          ? "border-white bg-white text-slate-900"
                          : "border-white/20 bg-white/5 text-white/80 hover:border-white/40"
                      }`}
                    >
                      {cat.name}
                    </button>
                    {!cat.isDefault ? (
                      <button
                        type="button"
                        onClick={() => requestDeleteCategory(cat)}
                        disabled={isDeletingCategory === cat.slug}
                        className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-rose-100 transition hover:bg-white/20 disabled:opacity-50"
                        aria-label={`Delete category ${cat.name}`}
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setShowNewCategory((prev) => !prev);
                  setNewCategoryName("");
                }}
                className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
              >
                + Add category
              </button>
            </div>
            {showNewCategory && (
              <div className="flex flex-wrap gap-2">
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white shadow-inner shadow-sky-900/30 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleAddCategory();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => void handleAddCategory()}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
                >
                  Add category
                </button>
              </div>
            )}
          </div>
          <div className="space-y-2 text-sm text-sky-100/90">
            <span className="font-semibold text-white">Design theme</span>

            <div className="flex flex-wrap items-center gap-2">
              {designThemeOptions.map((theme) => {
                const active = values.designTheme === theme.slug;
                const key = theme.id
                  ? `design-${theme.id}`
                  : `default-${theme.slug}`;
                return (
                  <div key={key} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setValues((prev) => ({
                          ...prev,
                          designTheme: theme.slug,
                        }))
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-white bg-white text-slate-900"
                          : "border-white/20 bg-white/5 text-white/80 hover:border-white/40"
                      }`}
                    >
                      {capitalize(theme.name)}
                    </button>
                    {!theme.isDefault ? (
                      <button
                        type="button"
                        onClick={() => requestDeleteDesign(theme)}
                        disabled={isDeletingDesign === theme.slug}
                        className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-rose-100 transition hover:bg-white/20 disabled:opacity-50"
                        aria-label={`Delete design ${theme.name}`}
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setShowNewDesign((prev) => !prev);
                  setNewDesignName("");
                }}
                className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
              >
                + Add design
              </button>
            </div>
            {showNewDesign && (
              <div className="flex flex-wrap gap-2">
                <input
                  value={newDesignName}
                  onChange={(e) => setNewDesignName(e.target.value)}
                  placeholder="New design name"
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white shadow-inner shadow-sky-900/30 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleAddDesign();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => void handleAddDesign()}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
                >
                  Add design
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm text-sky-100/90">
            <span className="font-semibold text-white">Stock mode</span>
            <div className="flex flex-wrap gap-2">
              {(["unlimited", "limited"] as const).map((mode) => {
                const isSelected = values.stockMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      setValues((prev) => ({
                        ...prev,
                        stockMode: mode,
                      }))
                    }
                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                      isSelected
                        ? "border-white/60 bg-white/15 text-white"
                        : "border-white/20 bg-white/5 text-white/80 hover:border-white/40"
                    }`}
                  >
                    {mode === "unlimited" ? "Unlimited" : "Limited"}
                  </button>
                );
              })}
            </div>
            {values.stockMode === "limited" ? (
              <div className="space-y-2">
                <span className="text-xs text-sky-100/80">Stock quantity</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={values.stockQty}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, stockQty: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white shadow-inner shadow-sky-900/40 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
                  placeholder="25"
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-2 text-sm text-sky-100/90">
            <span className="font-semibold text-white">Sizes</span>
            <div className="flex flex-wrap gap-2">
              {(["S", "M", "L", "XL", "XXL"] as const).map((size) => {
                const checked = values.sizes.includes(size);
                return (
                  <label
                    key={size}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                      checked
                        ? "border-white/60 bg-white/15 text-white"
                        : "border-white/20 bg-white/5 text-white/80"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/40 bg-white/5 text-emerald-400 focus:ring-2 focus:ring-white/40"
                      checked={checked}
                      onChange={(e) =>
                        setValues((prev) => {
                          const nextSizes = e.target.checked
                            ? [...prev.sizes, size]
                            : prev.sizes.filter((item) => item !== size);
                          const normalized = size.toUpperCase();
                          const nextSoldOutSizes = e.target.checked
                            ? prev.soldOutSizes
                            : prev.soldOutSizes.filter(
                                (entry) => entry.toUpperCase() !== normalized,
                              );
                          return {
                            ...prev,
                            sizes: nextSizes,
                            soldOutSizes: nextSoldOutSizes,
                          };
                        })
                      }
                    />
                    {size}
                  </label>
                );
              })}
            </div>
            {values.sizes.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-sky-100/70">
                  Mark sold out
                </p>
                <div className="flex flex-wrap gap-2">
                  {values.sizes.map((size) => {
                    const isSoldOut = values.soldOutSizes.some(
                      (entry) => entry.toUpperCase() === size.toUpperCase(),
                    );
                    return (
                      <button
                        key={`soldout-${size}`}
                        type="button"
                        onClick={() => toggleSoldOutSize(size)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          isSoldOut
                            ? "border-rose-300/60 bg-rose-500/15 text-rose-50 opacity-70 ring-1 ring-rose-400/40"
                            : "border-white/20 bg-white/5 text-white/80 hover:border-white/40"
                        }`}
                      >
                        {size}
                        {isSoldOut ? (
                          <span className="text-[10px] uppercase tracking-wide">
                            Sold out
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-2 text-sm text-sky-100/90 md:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/40 bg-white/5 text-emerald-400 focus:ring-2 focus:ring-white/40"
                checked={values.sizeGuideEnabled}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  setValues((prev) => ({
                    ...prev,
                    sizeGuideEnabled: enabled,
                    sizeGuideImageUrl: enabled ? prev.sizeGuideImageUrl : "",
                    sizeGuideImagePublicId: enabled
                      ? prev.sizeGuideImagePublicId
                      : "",
                  }));
                }}
              />
              Size guide (Guide des tailles)
            </label>
            {values.sizeGuideEnabled ? (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-sky-900/30">
                {values.sizeGuideImageUrl ? (
                  <div className="flex flex-wrap items-start gap-3">
                    <Image
                      src={values.sizeGuideImageUrl}
                      alt="Size guide preview"
                      width={320}
                      height={320}
                      className="h-32 w-auto max-w-full rounded-xl border border-white/15 object-contain"
                      sizes="320px"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setValues((prev) => ({
                          ...prev,
                          sizeGuideImageUrl: "",
                          sizeGuideImagePublicId: "",
                        }))
                      }
                      className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/10"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-sky-100/70">
                    No size guide uploaded yet.
                  </span>
                )}

                <label
                  className={`inline-flex w-fit cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-white shadow shadow-sky-900/40 transition ${
                    cloudinaryMissing
                      ? "cursor-not-allowed bg-white/10 opacity-60"
                      : "bg-white/10 hover:bg-white/15"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSizeGuideChange}
                    disabled={!cloudinaryConfigured}
                  />
                  {uploadingSizeGuide
                    ? "Uploading..."
                    : "Upload size guide image"}
                </label>
              </div>
            ) : (
              <p className="text-xs text-sky-100/70">
                Enable to upload a size guide image for this product.
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm text-sky-100/90 md:col-span-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-sky-100">Colors</label>
              <div className="flex flex-wrap items-center gap-2">
                {values.colors.map((color, index) => {
                  const hexValue = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(
                    color.hex,
                  )
                    ? color.hex
                    : "#000000";
                  const normalizedHex = normalizeHexValue(
                    color.hex || hexValue,
                  );
                  const isSoldOut = values.soldOutColorCodes.some(
                    (entry) => normalizeHexValue(entry) === normalizedHex,
                  );
                  return (
                    <div
                      key={`color-${index}`}
                      className={`flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 ${
                        isSoldOut ? "ring-1 ring-rose-300/30" : ""
                      }`}
                    >
                      <label className="relative inline-flex h-7 w-7">
                        <input
                          type="color"
                          value={hexValue}
                          onChange={(e) => {
                            const nextHex = e.target.value;
                            setValues((prev) => {
                              const previousHex = prev.colors[index]?.hex ?? "";
                              const nextColors = prev.colors.map((entry, i) =>
                                i === index ? { hex: nextHex } : entry,
                              );
                              const prevNormalized = normalizeHexValue(
                                previousHex || hexValue,
                              );
                              const nextNormalized = normalizeHexValue(nextHex);
                              const hadSoldOut = prev.soldOutColorCodes.some(
                                (entry) =>
                                  normalizeHexValue(entry) === prevNormalized,
                              );
                              const nextSoldOutColorCodes = hadSoldOut
                                ? Array.from(
                                    new Set(
                                      prev.soldOutColorCodes
                                        .filter(
                                          (entry) =>
                                            normalizeHexValue(entry) !==
                                            prevNormalized,
                                        )
                                        .concat(
                                          nextNormalized
                                            ? [nextNormalized]
                                            : [],
                                        ),
                                    ),
                                  )
                                : prev.soldOutColorCodes;
                              return {
                                ...prev,
                                colors: nextColors,
                                soldOutColorCodes: nextSoldOutColorCodes,
                              };
                            });
                          }}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          aria-label={`Pick color ${index + 1}`}
                        />
                        <span
                          className={`relative inline-flex h-7 w-7 rounded-full border border-white/20 bg-slate-900/60 shadow-sm ${
                            isSoldOut ? "ring-2 ring-white/70" : ""
                          }`}
                        >
                          <span
                            className="absolute inset-1 rounded-full"
                            style={{ backgroundColor: hexValue }}
                          />
                        </span>
                      </label>
                      <input
                        type="text"
                        value={color.hex}
                        onChange={(e) => {
                          const nextHex = e.target.value.trim();
                          setValues((prev) => {
                            const previousHex = prev.colors[index]?.hex ?? "";
                            const prevNormalized = normalizeHexValue(
                              previousHex || hexValue,
                            );
                            const nextNormalized = normalizeHexValue(nextHex);
                            const hadSoldOut = prev.soldOutColorCodes.some(
                              (entry) =>
                                normalizeHexValue(entry) === prevNormalized,
                            );
                            const nextSoldOutColorCodes = hadSoldOut
                              ? Array.from(
                                  new Set(
                                    prev.soldOutColorCodes
                                      .filter(
                                        (entry) =>
                                          normalizeHexValue(entry) !==
                                          prevNormalized,
                                      )
                                      .concat(
                                        nextNormalized ? [nextNormalized] : [],
                                      ),
                                  ),
                                )
                              : prev.soldOutColorCodes;
                            return {
                              ...prev,
                              colors: prev.colors.map((entry, i) =>
                                i === index ? { hex: nextHex } : entry,
                              ),
                              soldOutColorCodes: nextSoldOutColorCodes,
                            };
                          });
                        }}
                        className="w-28 rounded-md border border-white/20 bg-white/5 px-2 py-1 text-xs text-white shadow-inner shadow-sky-900/40 focus:border-white/40 focus:outline-none"
                        placeholder="#000000"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          toggleSoldOutColor(color.hex || hexValue)
                        }
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                          isSoldOut
                            ? "border border-rose-300/60 bg-rose-500/15 text-rose-50"
                            : "border border-white/20 bg-white/10 text-white hover:bg-white/15"
                        }`}
                      >
                        {isSoldOut ? "Sold out" : "Mark sold out"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setValues((prev) => {
                            const removedHex = prev.colors[index]?.hex ?? "";
                            return {
                              ...prev,
                              colors: prev.colors.filter(
                                (_, i) => i !== index,
                              ) || [{ hex: "#000000" }],
                              soldOutColorCodes: prev.soldOutColorCodes.filter(
                                (entry) =>
                                  normalizeHexValue(entry) !==
                                  normalizeHexValue(removedHex),
                              ),
                            };
                          })
                        }
                        className="text-[11px] text-rose-200 hover:text-rose-100"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
                  onClick={() =>
                    setValues((prev) => ({
                      ...prev,
                      colors: [...prev.colors, { hex: "#ffffff" }],
                    }))
                  }
                >
                  + Add Color
                </button>
              </div>
            </div>
          </div>

          <label className="space-y-2 text-sm text-sky-100/90">
            <span className="font-semibold text-white">Gender (optional)</span>
            <select
              value={values.gender}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  gender: e.target.value as ProductFormValues["gender"],
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner shadow-sky-900/40 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/40 dark:bg-slate-950 dark:text-white"
            >
              <option
                className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white"
                value=""
              >
                Not set
              </option>
              <option
                className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white"
                value="unisex"
              >
                Unisex
              </option>
              <option
                className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white"
                value="men"
              >
                Men
              </option>
              <option
                className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white"
                value="women"
              >
                Women
              </option>
            </select>
          </label>

          <div className="space-y-2 text-sm text-sky-100/90 md:col-span-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white">Images</p>
              {cloudinaryMissing ? (
                <span className="text-[12px] text-amber-200">
                  Cloudinary is not configured. You can still save products
                  without images.
                </span>
              ) : null}
            </div>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-sky-900/30">
              <div className="flex flex-wrap gap-3">
                {values.images.length === 0 ? (
                  <span className="text-xs text-sky-100/70">
                    No images yet.
                  </span>
                ) : (
                  values.images.map((url, index) => (
                    <div
                      key={`${url}-${index}`}
                      className="relative h-20 w-20 overflow-hidden rounded-xl border border-white/15"
                    >
                      <Image
                        src={url}
                        alt={`Product ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setValues((prev) => ({
                            ...prev,
                            images: prev.images.filter((_, i) => i !== index),
                          }))
                        }
                        className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white hover:bg-black/90"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>

              <label
                className={`inline-flex w-fit cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-white shadow shadow-sky-900/40 transition ${
                  cloudinaryMissing
                    ? "cursor-not-allowed bg-white/10 opacity-60"
                    : "bg-white/10 hover:bg-white/15"
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={!cloudinaryConfigured}
                />
                {uploading ? "Uploading..." : "Upload image"}
              </label>
            </div>
          </div>
        </div>

        {error ? <p className="text-sm text-rose-200">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading || uploading || isSubmitting}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-400/90 px-5 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-900/50 transition hover:bg-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting || loading ? "Saving..." : submitLabel}
          </button>
          <span className="text-xs text-sky-100/70">
            Values accept commas for tags, sizes, and colors. Discounted price
            is preview-only until saved.
          </span>
        </div>
      </form>

      {mounted && pendingDelete
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-[#082f55]/84 px-4"
              role="dialog"
              aria-modal
            >
              <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#082f55]/95 p-6 text-white shadow-lg shadow-black/25">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-sky-200">
                    Confirm delete
                  </p>
                  <h3 className="text-lg font-semibold">
                    Delete{" "}
                    {pendingDelete.type === "category" ? "category" : "design"}{" "}
                    &quot;{pendingDelete.item.name}&quot;?
                  </h3>
                  <p className="text-sm text-sky-100/80">
                    This will remove it from all selectors. Products using it
                    will fall back to the first available option.
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={Boolean(deletingSlug)}
                    className="flex-1 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingSlug ? "Deleting..." : "Yes, delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(null)}
                    disabled={Boolean(deletingSlug)}
                    className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    No, keep it
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
