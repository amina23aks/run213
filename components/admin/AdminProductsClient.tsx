"use client";

import type { User } from "firebase/auth";
import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminProductForm } from "@/components/admin/products/AdminProductForm";
import { AdminProductList } from "@/components/admin/products/AdminProductList";
import type { ProductDraft, ProductDraftColor } from "@/components/admin/products/types";
import { extractFirebaseAuthCode, getAuthErrorMessage } from "@/lib/auth-errors";
import { getMissingFirebaseClientEnv } from "@/lib/env";
import type { Product } from "@/types/product";

type AdminProductsResponse = {
  products: Product[];
  nextCursor: string | null;
};

const missingClientEnv = getMissingFirebaseClientEnv();

const emptyDraft: ProductDraft = {
  name: "",
  slug: "",
  description: "",
  category: "tshirts",
  priceDzd: "",
  compareAtPriceDzd: "",
  images: [],
  imageUrlDraft: "",
  colors: [{ id: "color-1", name: "Black", hex: "#111111" }],
  sizes: ["S", "M", "L", "XL"],
  status: "draft",
  inStock: true,
  stockMode: "unlimited",
  stockQty: "",
  isPromo: false,
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
  const [message, setMessage] = useState(() => missingClientEnv.length ? `Missing Firebase env: ${missingClientEnv.join(", ")}` : "Sign in with an approved admin email.");
  const [formErrors, setFormErrors] = useState<string[]>([]);

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
        setMessage("Products loaded.");
      } catch {
        setIsAuthorized(false);
        setMessage("Access denied or Firebase admin env is missing.");
      }
    },
    [adminFetch],
  );

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    fetch("/api/admin/config")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Config unavailable")))
      .then((data: { missingServerEnv: string[] }) => setMissingServerEnv(data.missingServerEnv))
      .catch(() => setMissingServerEnv(["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"]));

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
                setMessage("Products loaded.");
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
  }, []);

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
      setMessage("Product saved.");
    } catch (error) {
      setMessage(formatAdminError(error));
    }
  }

  async function archiveProduct(id: string) {
    try {
      await adminFetch(`/api/admin/products/${id}`, { method: "DELETE" });
      await loadProducts();
      setMessage("Product archived.");
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

  function addImageUrl() {
    const url = draft.imageUrlDraft.trim();
    if (!url) {
      setMessage("Enter an image URL or path first.");
      return;
    }
    setDraft((current) => ({
      ...current,
      imageUrlDraft: "",
      images: [...current.images, { id: `image-${Date.now()}`, url }],
    }));
    setFormErrors([]);
  }

  function removeImage(id: string) {
    setDraft((current) => ({ ...current, images: current.images.filter((image) => image.id !== id) }));
    setFormErrors([]);
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
          onAddImageUrl={addImageUrl}
          onCancelEdit={cancelEdit}
          onChange={setDraftField}
          onColorChange={updateColor}
          onRemoveColor={removeColor}
          onRemoveImage={removeImage}
          onSubmit={saveProduct}
          onToggleSize={toggleSize}
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
  if (!draft.slug.trim()) errors.push("Slug is required.");
  if (!draft.priceDzd.trim()) errors.push("Price DZD is required.");
  if (!draft.images.length) errors.push("Add at least one image path, for example /tshirt.png.");
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
  return {
    name: draft.name,
    slug: draft.slug,
    description: draft.description,
    category: draft.category,
    priceDzd: draft.priceDzd,
    compareAtPriceDzd: draft.compareAtPriceDzd,
    images: draft.images.map((image) => ({ url: image.url, alt: draft.name })),
    colors: draft.colors
      .filter((color) => color.name.trim() && /^#[0-9a-fA-F]{6}$/.test(color.hex.trim()))
      .map((color) => ({ name: color.name.trim(), hex: color.hex.trim() })),
    sizes: draft.sizes.map((label) => ({ label })),
    status: draft.status,
    inStock: draft.inStock,
    stockMode: draft.stockMode,
    stockQty: draft.stockQty,
    isPromo: draft.isPromo,
    dropSlug: draft.dropSlug,
    sortOrder: draft.sortOrder,
    showInDrop001: draft.showInDrop001,
    showInFeaturedDrop: draft.showInFeaturedDrop,
    showInShopTheLook: draft.showInShopTheLook,
    featuredSortOrder: draft.featuredSortOrder,
    lookGroupSlug: draft.lookGroupSlug,
  };
}

function fromProduct(product: Product): ProductDraft {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description,
    category: product.category,
    priceDzd: String(product.priceDzd),
    compareAtPriceDzd: product.compareAtPriceDzd ? String(product.compareAtPriceDzd) : "",
    images: product.images.map((image, index) => ({ id: `image-${index}-${image.url}`, url: image.url })),
    imageUrlDraft: "",
    colors: product.colors.length ? product.colors.map((color, index) => ({ id: `color-${index}-${color.hex}`, name: color.name, hex: color.hex })) : [{ id: "color-1", name: "Black", hex: "#111111" }],
    sizes: product.sizes.map((size) => size.label),
    status: product.status,
    inStock: product.inStock,
    stockMode: product.stockMode === "limited" ? "limited" : "unlimited",
    stockQty: product.stockQty === null ? "" : String(product.stockQty),
    isPromo: product.isPromo,
    dropSlug: product.dropSlug ?? "",
    sortOrder: String(product.sortOrder),
    showInDrop001: product.showInDrop001,
    showInFeaturedDrop: product.showInFeaturedDrop,
    showInShopTheLook: product.showInShopTheLook,
    featuredSortOrder: product.featuredSortOrder === null ? "" : String(product.featuredSortOrder),
    lookGroupSlug: product.lookGroupSlug ?? "",
  };
}
