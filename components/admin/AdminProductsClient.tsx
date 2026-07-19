"use client";

import type { User } from "firebase/auth";
import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminProductForm } from "@/components/admin/products/AdminProductForm";
import { AdminProductList } from "@/components/admin/products/AdminProductList";
import type { ProductDraft, ProductDraftColor, ProductDraftImage } from "@/components/admin/products/types";
import { extractFirebaseAuthCode, getAuthErrorMessage } from "@/lib/auth-errors";
import { getMissingFirebaseClientEnv } from "@/lib/env";
import type { Product } from "@/types/product";

type AdminProductsResponse = {
  products: Product[];
  nextCursor: string | null;
};

type AdminConfigResponse = {
  missingServerEnv: string[];
  missingCloudinaryEnv?: string[];
  cloudinaryConfigured?: boolean;
};

type UploadImageResponse = {
  secureUrl?: unknown;
  publicId?: unknown;
  error?: unknown;
};

const missingClientEnv = getMissingFirebaseClientEnv();

const emptyDraft: ProductDraft = {
  name: "",
  slug: "",
  description: "",
  category: "tshirts",
  basePriceDzd: "",
  priceDzd: "",
  discountPercent: "0",
  costPriceDzd: "",
  compareAtPriceDzd: "",
  images: [],
  colors: [{ id: "color-1", name: "Black", hex: "#111111" }],
  sizes: ["S", "M", "L", "XL"],
  status: "draft",
  stockMode: "unlimited",
  stockQty: "",
  isPromo: false,
  featured: false,
  sizeGuideEnabled: false,
  sizeGuideImageUrl: "",
  sizeGuideImagePublicId: "",
  dropSlug: "drop-001",
  sortOrder: "100",
  showInDrop001: false,
  showInFeaturedDrop: false,
  showInShopTheLook: false,
  featuredSortOrder: "",
  lookGroupSlug: "",
};

export function AdminProductsClient() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [missingServerEnv, setMissingServerEnv] = useState<string[]>([]);
  const [cloudinaryConfigured, setCloudinaryConfigured] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingSizeGuide, setUploadingSizeGuide] = useState(false);
  const [message, setMessage] = useState(() => missingClientEnv.length ? `Missing Firebase env: ${missingClientEnv.join(", ")}` : "Sign in with an approved admin email.");
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const showTemporaryMessage = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
    window.setTimeout(() => {
      setMessage((current) => current === nextMessage ? "" : current);
    }, 3200);
  }, []);

  const adminFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const token = await user?.getIdToken();
      const response = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...init?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    [user],
  );

  const loadProducts = useCallback(
    async (cursor?: string | null) => {
      try {
        const url = cursor ? `/api/admin/products?cursor=${encodeURIComponent(cursor)}` : "/api/admin/products";
        const data = (await adminFetch(url)) as AdminProductsResponse;
        setProducts((current) => (cursor ? [...current, ...data.products] : data.products));
        setNextCursor(data.nextCursor);
        setIsAuthorized(true);
        showTemporaryMessage("Products loaded.");
      } catch {
        setIsAuthorized(false);
        setMessage("Access denied or Firebase admin env is missing.");
      }
    },
    [adminFetch, showTemporaryMessage],
  );

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    fetch("/api/admin/config")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Config unavailable")))
      .then((data: AdminConfigResponse) => {
        setMissingServerEnv(data.missingServerEnv);
        setCloudinaryConfigured(data.cloudinaryConfigured === true);
      })
      .catch(() => {
        setMissingServerEnv(["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"]);
        setCloudinaryConfigured(false);
      });

    if (missingClientEnv.length) {
      return () => undefined;
    }

    Promise.all([import("@/lib/firebase/client"), import("firebase/auth")])
      .then(([client, authModule]) => {
        authModule.getRedirectResult(client.auth)
          .catch((error: unknown) => setMessage(getAuthErrorMessage(extractFirebaseAuthCode(error))));
        unsubscribe = authModule.onAuthStateChanged(client.auth, (nextUser) => {
          setUser(nextUser);
          setIsAuthorized(false);
          setProducts([]);
          setNextCursor(null);

          if (nextUser) {
            nextUser.getIdToken()
              .then((token) => fetch("/api/admin/products", { headers: { Authorization: `Bearer ${token}` } }))
              .then((response) => response.ok ? response.json() : Promise.reject(new Error("Access denied")))
              .then((data: AdminProductsResponse) => {
                setProducts(data.products);
                setNextCursor(data.nextCursor);
                setIsAuthorized(true);
                showTemporaryMessage("Products loaded.");
              })
              .catch(() => {
                setIsAuthorized(false);
                setMessage("Access denied or Firebase admin env is missing.");
              });
          }
        });
      })
      .catch(() => setMessage("Firebase client env is missing."));

    return () => unsubscribe?.();
  }, [showTemporaryMessage]);

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateDraft(draft);
    setFormErrors(validationErrors);
    if (validationErrors.length) {
      setMessage("Fix the product form errors before saving.");
      return;
    }

    try {
      const body = JSON.stringify(toPayload(draft));
      await adminFetch(editingId ? `/api/admin/products/${editingId}` : "/api/admin/products", {
        method: editingId ? "PUT" : "POST",
        body,
      });
      setDraft(emptyDraft);
      setEditingId(null);
      await loadProducts();
      showTemporaryMessage(draft.status === "active" ? "Product published and is now visible in the storefront." : "Product saved as draft. It is not visible in the storefront.");
    } catch (error) {
      setMessage(formatAdminError(error));
    }
  }

  async function archiveProduct(id: string) {
    try {
      await adminFetch(`/api/admin/products/${id}`, { method: "DELETE" });
      await loadProducts();
      showTemporaryMessage("Product archived.");
    } catch (error) {
      setMessage(formatAdminError(error));
    }
  }

  function editProduct(product: Product) {
    setEditingId(product.id);
    setDraft(fromProduct(product));
    setFormErrors([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(emptyDraft);
    setFormErrors([]);
  }

  function setDraftField<Key extends keyof ProductDraft>(key: Key, value: ProductDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFormErrors([]);
  }




  async function uploadImage(file: File, kind: "product" | "sizeGuide" = "product") {
    if (!user) {
      setMessage("Sign in with an approved admin email before uploading images.");
      return;
    }

    if (kind === "sizeGuide") {
      setUploadingSizeGuide(true);
    } else {
      setUploadingImage(true);
    }
    try {
      const token = await user.getIdToken();
      const body = new FormData();
      body.append("file", file);
      body.append("kind", kind);
      const response = await fetch("/api/admin/uploads/image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = (await response.json()) as UploadImageResponse;

      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Image upload failed. Try again.");
      }

      if (typeof data.secureUrl !== "string") {
        throw new Error("Image upload failed. Try again.");
      }

      const uploadedImageUrl = data.secureUrl;
      const uploadedImageId = typeof data.publicId === "string" ? data.publicId : `image-${Date.now()}`;
      setDraft((current) => kind === "sizeGuide" ? {
        ...current,
        sizeGuideEnabled: true,
        sizeGuideImageUrl: uploadedImageUrl,
        sizeGuideImagePublicId: uploadedImageId,
      } : {
        ...current,
        images: [...current.images, { id: uploadedImageId, url: uploadedImageUrl, publicId: uploadedImageId, alt: current.name || "Product image", sortOrder: current.images.length, isPrimary: current.images.length === 0, colorId: null }],
      });
      setFormErrors([]);
      setMessage("Image uploaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image upload failed. Try again.");
    } finally {
      if (kind === "sizeGuide") {
        setUploadingSizeGuide(false);
      } else {
        setUploadingImage(false);
      }
    }
  }

  function removeImage(id: string) {
    setDraft((current) => {
      const images = current.images.filter((image) => image.id !== id).map((image, index) => ({ ...image, sortOrder: index }));
      return { ...current, images: images.some((image) => image.isPrimary) ? images : images.map((image, index) => ({ ...image, isPrimary: index === 0 })) };
    });
    setFormErrors([]);
  }

  function updateImage(id: string, patch: Partial<ProductDraftImage>) {
    setDraft((current) => ({
      ...current,
      images: current.images.map((image) => image.id === id ? { ...image, ...patch } : image),
    }));
    setFormErrors([]);
  }

  function setPrimaryImage(id: string) {
    setDraft((current) => ({ ...current, images: current.images.map((image) => ({ ...image, isPrimary: image.id === id })) }));
  }

  function moveImage(id: string, direction: -1 | 1) {
    setDraft((current) => {
      const images = [...current.images].sort((a, b) => a.sortOrder - b.sortOrder);
      const index = images.findIndex((image) => image.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= images.length) return current;
      [images[index], images[nextIndex]] = [images[nextIndex], images[index]];
      return { ...current, images: images.map((image, sortOrder) => ({ ...image, sortOrder })) };
    });
  }

  function addColor() {
    setDraft((current) => ({
      ...current,
      colors: [...current.colors, { id: `color-${Date.now()}`, name: "", hex: "#000000" }],
    }));
    setFormErrors([]);
  }

  function updateColor(id: string, patch: Partial<Omit<ProductDraftColor, "id">>) {
    setDraft((current) => ({
      ...current,
      colors: current.colors.map((color) => color.id === id ? { ...color, ...patch } : color),
    }));
    setFormErrors([]);
  }

  function removeColor(id: string) {
    setDraft((current) => ({
      ...current,
      colors: current.colors.length > 1 ? current.colors.filter((color) => color.id !== id) : current.colors,
    }));
    setFormErrors([]);
  }

  function toggleSize(size: string) {
    setDraft((current) => ({
      ...current,
      sizes: current.sizes.includes(size) ? current.sizes.filter((item) => item !== size) : [...current.sizes, size],
    }));
    setFormErrors([]);
  }

  if (!user || !isAuthorized) {
    return (
      <AdminShell title="Products" description="Create, edit, and archive storefront products for real testing.">
        <AdminAccessState missingClientEnv={missingClientEnv} missingServerEnv={missingServerEnv} message={message} />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Products" description="Create, edit, and archive storefront products for real testing.">
      <p className="adminNotice">{message}</p>
      <div className="adminProductsWorkspace">
        <AdminProductForm
          draft={draft}
          editingId={editingId}
          errors={formErrors}
          onAddColor={addColor}
          onCancelEdit={cancelEdit}
          onChange={setDraftField}
          onColorChange={updateColor}
          onRemoveColor={removeColor}
          onRemoveImage={removeImage}
          onUpdateImage={updateImage}
          onSetPrimaryImage={setPrimaryImage}
          onMoveImage={moveImage}
          onSubmit={saveProduct}
          onToggleSize={toggleSize}
          onUploadImage={(file) => uploadImage(file, "product")}
          onUploadSizeGuide={(file) => uploadImage(file, "sizeGuide")}
          uploadingImage={uploadingImage}
          uploadingSizeGuide={uploadingSizeGuide}
          cloudinaryConfigured={cloudinaryConfigured}
        />
        <AdminProductList products={products} nextCursor={nextCursor} onArchive={archiveProduct} onEdit={editProduct} onLoadMore={loadProducts} />
      </div>
    </AdminShell>
  );
}

function AdminAccessState({ missingClientEnv, missingServerEnv, message }: { missingClientEnv: string[]; missingServerEnv: string[]; message: string }) {
  return (
    <section className="adminAccessState adminCard">
      <div className="adminCard__heading">
        <p>ADMIN ACCESS</p>
        <h2>Admin access required</h2>
        <span>Sign in from the account icon, then return to this page.</span>
      </div>
      {missingClientEnv.length ? <p className="adminNotice adminNotice--error">Missing client env: {missingClientEnv.join(", ")}</p> : null}
      {missingServerEnv.length ? <p className="adminNotice adminNotice--error">Missing server env: {missingServerEnv.join(", ")}</p> : null}
      <p className="adminNotice">{message}</p>
    </section>
  );
}

function validateDraft(draft: ProductDraft): string[] {
  const errors: string[] = [];
  if (!draft.name.trim()) errors.push("Product name is required.");
  if (!draft.priceDzd.trim()) errors.push("Selling Price is required.");
  if (Number(draft.priceDzd) < 0 || Number(draft.basePriceDzd) < 0 || Number(draft.costPriceDzd) < 0 || Number(draft.compareAtPriceDzd) < 0) errors.push("Prices cannot be negative.");
  const discount = Number(draft.discountPercent || 0);
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) errors.push("Discount must be between 0 and 100.");
  if (!draft.images.length) errors.push("Upload at least one product image.");
  if (!draft.colors.some((color) => color.name.trim() && /^#[0-9a-fA-F]{6}$/.test(color.hex.trim()))) errors.push("Add at least one color with a name and valid #HEX value.");
  if (draft.stockMode === "limited" && !draft.stockQty.trim()) errors.push("Stock quantity is required when stock mode is limited.");
  return errors;
}


function formatAdminError(error: unknown): string {
  const fallback = "Product save failed. Check the highlighted fields and try again.";

  if (!(error instanceof Error)) return fallback;

  try {
    const parsed = JSON.parse(error.message) as { error?: unknown; issues?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> } };
    if (typeof parsed.error === "string" && parsed.error !== "Invalid product input") return parsed.error;
    const fieldErrors = parsed.issues?.fieldErrors;
    if (fieldErrors) {
      const messages = Object.entries(fieldErrors)
        .flatMap(([field, fieldMessages]) => fieldMessages.map((fieldMessage) => `${field}: ${fieldMessage}`));
      if (messages[0]) return messages[0];
    }
    const firstFormError = parsed.issues?.formErrors?.[0];
    if (firstFormError) return firstFormError;
  } catch {
    if (error.message && !error.message.trim().startsWith("{")) return error.message;
  }

  return fallback;
}

function toPayload(draft: ProductDraft) {
  const discountPercent = Math.max(0, Math.min(100, Number(draft.discountPercent || 0)));
  const isOnSale = discountPercent > 0;
  const priceDzd = draft.priceDzd;
  const basePriceDzd = isOnSale ? draft.basePriceDzd || draft.compareAtPriceDzd || draft.priceDzd : priceDzd;
  const compareAtPriceDzd = isOnSale ? basePriceDzd : null;
  return {
    name: draft.name,
    slug: slugify(draft.name),
    description: draft.description,
    category: draft.category,
    basePriceDzd,
    priceDzd,
    compareAtPriceDzd,
    costPriceDzd: draft.costPriceDzd,
    discountPercent,
    images: draft.images.map((image, index) => ({ id: image.id, url: image.url, alt: image.alt || draft.name || "Product image", publicId: image.publicId, sortOrder: image.sortOrder ?? index, isPrimary: image.isPrimary, colorId: image.colorId ?? null })),
    colors: draft.colors
      .filter((color) => /^#[0-9a-fA-F]{6}$/.test(color.hex.trim()))
      .map((color, index) => ({ id: color.id || `color-${index}`, name: color.name.trim() || `Color ${index + 1}`, hex: color.hex.trim().toUpperCase() })),
    sizes: draft.sizes.map((label) => ({ label })),
    status: draft.status,
    inStock: draft.stockMode === "unlimited" || Number(draft.stockQty) > 0,
    stockMode: draft.stockMode,
    stockQty: draft.stockQty,
    isPromo: isOnSale,
    featured: draft.featured,
    sizeGuideEnabled: draft.sizeGuideEnabled,
    sizeGuideImageUrl: draft.sizeGuideImageUrl,
    sizeGuideImagePublicId: draft.sizeGuideImagePublicId,
    dropSlug: draft.dropSlug,
    sortOrder: draft.sortOrder,
    showInDrop001: draft.showInDrop001,
    showInFeaturedDrop: draft.showInFeaturedDrop,
    showInShopTheLook: false,
    featuredSortOrder: draft.featuredSortOrder,
    lookGroupSlug: "",
  };
}

function fromProduct(product: Product): ProductDraft {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description,
    category: product.category,
    basePriceDzd: product.basePriceDzd ? String(product.basePriceDzd) : String(product.compareAtPriceDzd ?? product.priceDzd),
    priceDzd: String(product.priceDzd),
    discountPercent: String(product.discountPercent ?? 0),
    costPriceDzd: product.costPriceDzd ? String(product.costPriceDzd) : "",
    compareAtPriceDzd: product.compareAtPriceDzd ? String(product.compareAtPriceDzd) : "",
    images: product.images.map((image, index) => ({ id: image.id ?? image.publicId ?? `image-${index}-${image.url}`, url: image.url, publicId: image.publicId, alt: image.alt, sortOrder: image.sortOrder ?? index, isPrimary: image.isPrimary ?? index === 0, colorId: image.colorId ?? null })),
    colors: product.colors.length ? product.colors.map((color, index) => ({ id: color.id ?? `color-${index}-${color.hex}`, name: color.name, hex: color.hex })) : [{ id: "color-1", name: "Black", hex: "#111111" }],
    sizes: product.sizes.map((size) => size.label),
    status: product.status === "archived" ? "draft" : product.status,
    stockMode: product.stockMode === "limited" ? "limited" : "unlimited",
    stockQty: product.stockQty === null ? "" : String(product.stockQty),
    isPromo: product.isPromo,
    featured: product.featured,
    sizeGuideEnabled: product.sizeGuideEnabled ?? false,
    sizeGuideImageUrl: product.sizeGuideImageUrl ?? "",
    sizeGuideImagePublicId: product.sizeGuideImagePublicId ?? "",
    dropSlug: product.dropSlug ?? "",
    sortOrder: String(product.sortOrder),
    showInDrop001: product.showInDrop001,
    showInFeaturedDrop: product.showInFeaturedDrop,
    showInShopTheLook: product.showInShopTheLook,
    featuredSortOrder: product.featuredSortOrder === null ? "" : String(product.featuredSortOrder),
    lookGroupSlug: product.lookGroupSlug ?? "",
  };
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
