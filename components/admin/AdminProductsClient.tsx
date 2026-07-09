"use client";

import type { Auth, User } from "firebase/auth";
import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminProductForm } from "@/components/admin/products/AdminProductForm";
import { AdminProductList } from "@/components/admin/products/AdminProductList";
import type { ParsedColor, ProductDraft } from "@/components/admin/products/types";
import { extractFirebaseAuthCode, getAuthErrorMessage, shouldFallbackToRedirect } from "@/lib/auth-errors";
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
  imagesText: "",
  colorsText: "Black|#111111",
  sizesText: "S, M, L, XL",
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
  const [clientAuth, setClientAuth] = useState<Auth | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        setClientAuth(client.auth);
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

  async function signInWithGoogle() {
    if (!clientAuth) return;

    try {
      const [{ signInWithPopup }, { googleProvider }] = await Promise.all([
        import("firebase/auth"),
        import("@/lib/firebase/client"),
      ]);
      await signInWithPopup(clientAuth, googleProvider);
    } catch (error: unknown) {
      const code = extractFirebaseAuthCode(error);
      setMessage(getAuthErrorMessage(code));
      if (shouldFallbackToRedirect(code)) {
        const [{ signInWithRedirect }, { googleProvider }] = await Promise.all([
          import("firebase/auth"),
          import("@/lib/firebase/client"),
        ]);
        await signInWithRedirect(clientAuth, googleProvider);
      }
    }
  }

  async function signInWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientAuth) return;
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      await signInWithEmailAndPassword(clientAuth, email, password);
    } catch (error: unknown) {
      setMessage(getAuthErrorMessage(extractFirebaseAuthCode(error)));
    }
  }

  async function signOutAdmin() {
    if (!clientAuth) return;
    const { signOut } = await import("firebase/auth");
    await signOut(clientAuth);
  }

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

  if (!user) {
    return (
      <AdminShell title="Products" description="Create, edit, and archive storefront products for real testing.">
        <section className="adminLoginCard adminCard">
          <div className="adminCard__heading">
            <p>ADMIN ACCESS</p>
            <h2>Sign in to manage products</h2>
            <span>Use an email listed in ADMIN_EMAILS or SUPER_ADMIN_EMAIL.</span>
          </div>
          {missingClientEnv.length ? <p className="adminNotice adminNotice--error">Missing client env: {missingClientEnv.join(", ")}</p> : null}
          {missingServerEnv.length ? <p className="adminNotice adminNotice--error">Missing server env: {missingServerEnv.join(", ")}</p> : null}
          <button className="adminPrimary" type="button" onClick={signInWithGoogle} disabled={!clientAuth || Boolean(missingClientEnv.length)}>
            Sign in with Google
          </button>
          <form className="adminEmailLogin" onSubmit={signInWithEmail}>
            <label>
              <span>Admin email</span>
              <input type="email" placeholder="admin@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              <span>Password</span>
              <input type="password" placeholder="Firebase Auth password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button type="submit" disabled={!clientAuth || Boolean(missingClientEnv.length)}>Sign in with email</button>
          </form>
          <p className="adminNotice">{message}</p>
        </section>
      </AdminShell>
    );
  }

  if (!isAuthorized) {
    return (
      <AdminShell title="Products" description="Create, edit, and archive storefront products for real testing.">
        <AdminProductsTopbar email={user.email} onSignOut={signOutAdmin} />
        <p className="adminNotice adminNotice--error">{message}</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Products" description="Create, edit, and archive storefront products for real testing.">
      <AdminProductsTopbar email={user.email} onSignOut={signOutAdmin} />
      <p className="adminNotice">{message}</p>
      <div className="adminProductsWorkspace">
        <AdminProductForm
          draft={draft}
          editingId={editingId}
          errors={formErrors}
          imageUrls={parseImageLines(draft.imagesText)}
          onCancelEdit={cancelEdit}
          onChange={setDraftField}
          onSubmit={saveProduct}
          parsedColors={parseColorLines(draft.colorsText)}
          parsedSizes={parseSizes(draft.sizesText)}
        />
        <AdminProductList products={products} nextCursor={nextCursor} onArchive={archiveProduct} onEdit={editProduct} onLoadMore={loadProducts} />
      </div>
    </AdminShell>
  );
}

function AdminProductsTopbar({ email, onSignOut }: { email: string | null; onSignOut: () => void }) {
  return (
    <div className="adminTopbar">
      <div>
        <span>Signed in</span>
        <p>{email}</p>
      </div>
      <button type="button" onClick={onSignOut}>Sign out</button>
    </div>
  );
}

function validateDraft(draft: ProductDraft): string[] {
  const errors: string[] = [];
  if (!draft.name.trim()) errors.push("Product name is required.");
  if (!draft.slug.trim()) errors.push("Slug is required.");
  if (!draft.priceDzd.trim()) errors.push("Price DZD is required.");
  if (!parseImageLines(draft.imagesText).length) errors.push("Add at least one image path, for example /tshirt.png.");
  if (!parseColorLines(draft.colorsText).length) errors.push("Add at least one color using Name|#HEX, for example Black|#111111.");
  if (draft.stockMode === "limited" && !draft.stockQty.trim()) errors.push("Stock quantity is required when stock mode is limited.");
  return errors;
}

function parseImageLines(value: string): string[] {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function parseColorLines(value: string): ParsedColor[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .map((line) => {
      const [name, hex] = line.split("|").map((part) => part?.trim() ?? "");
      return { name, hex };
    })
    .filter((color) => Boolean(color.name) && /^#[0-9a-fA-F]{6}$/.test(color.hex));
}

function parseSizes(value: string): string[] {
  return value.split(",").map((label) => label.trim()).filter(Boolean);
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
    images: parseImageLines(draft.imagesText).map((url) => ({ url, alt: draft.name })),
    colors: parseColorLines(draft.colorsText),
    sizes: parseSizes(draft.sizesText).map((label) => ({ label })),
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
    imagesText: product.images.map((image) => image.url).join("\n"),
    colorsText: product.colors.map((color) => `${color.name}|${color.hex}`).join("\n"),
    sizesText: product.sizes.map((size) => size.label).join(", "),
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
