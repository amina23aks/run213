"use client";

import type { Auth, User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getMissingFirebaseClientEnv } from "@/lib/env";
import type { Product, ProductCategory, ProductStatus, ProductStockMode } from "@/types/product";

type ProductDraft = {
  name: string;
  slug: string;
  description: string;
  category: ProductCategory;
  priceDzd: string;
  compareAtPriceDzd: string;
  imagesText: string;
  colorsText: string;
  sizesText: string;
  status: ProductStatus;
  inStock: boolean;
  stockMode: Extract<ProductStockMode, "unlimited" | "limited">;
  stockQty: string;
  isPromo: boolean;
  dropSlug: "drop-001" | "";
  sortOrder: string;
  showInDrop001: boolean;
  showInFeaturedDrop: boolean;
  showInShopTheLook: boolean;
  featuredSortOrder: string;
  lookGroupSlug: string;
};

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

  const title = useMemo(() => (editingId ? "Edit product" : "Create product"), [editingId]);

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
    const [{ signInWithPopup }, { googleProvider }] = await Promise.all([
      import("firebase/auth"),
      import("@/lib/firebase/client"),
    ]);
    await signInWithPopup(clientAuth, googleProvider);
  }

  async function signInWithEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!clientAuth) return;
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    await signInWithEmailAndPassword(clientAuth, email, password);
  }

  async function signOutAdmin() {
    if (!clientAuth) return;
    const { signOut } = await import("firebase/auth");
    await signOut(clientAuth);
  }

  async function saveProduct(event: React.FormEvent) {
    event.preventDefault();

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
    await adminFetch(`/api/admin/products/${id}`, { method: "DELETE" });
    await loadProducts();
    setMessage("Product archived.");
  }

  function editProduct(product: Product) {
    setEditingId(product.id);
    setDraft(fromProduct(product));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setDraftField<Key extends keyof ProductDraft>(key: Key, value: ProductDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
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
        <div className="adminTopbar">
          <div>
            <span>Signed in</span>
            <p>{user.email}</p>
          </div>
          <button type="button" onClick={signOutAdmin}>Sign out</button>
        </div>
        <p className="adminNotice adminNotice--error">{message}</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Products" description="Create, edit, and archive storefront products for real testing.">
      <div className="adminTopbar">
        <div>
          <span>Signed in</span>
          <p>{user.email}</p>
        </div>
        <button type="button" onClick={signOutAdmin}>Sign out</button>
      </div>
      <p className="adminNotice">{message}</p>

      <div className="adminProductsLayout">
        <form className="adminForm adminCard" onSubmit={saveProduct}>
          <div className="adminCard__heading">
            <p>{editingId ? "EDIT PRODUCT" : "CREATE PRODUCT"}</p>
            <h2>{title}</h2>
            <span>Keep the product data clean. Public storefront only shows active products.</span>
          </div>

          <div className="adminFormGrid">
            <AdminField label="Name" helper="Customer-facing product name.">
              <input placeholder="Oversized Tee" value={draft.name} onChange={(event) => setDraftField("name", event.target.value)} />
            </AdminField>
            <AdminField label="Slug" helper="Lowercase URL slug, e.g. oversized-tee.">
              <input placeholder="oversized-tee" value={draft.slug} onChange={(event) => setDraftField("slug", event.target.value)} />
            </AdminField>
            <AdminField label="Category">
              <select value={draft.category} onChange={(event) => setDraftField("category", event.target.value as ProductCategory)}>
                <option value="tshirts">T-Shirts</option>
                <option value="pants">Pants</option>
                <option value="hoodies">Hoodies</option>
                <option value="accessories">Accessories</option>
              </select>
            </AdminField>
            <AdminField label="Status" helper="Drafts stay hidden. Active products can appear publicly.">
              <select value={draft.status} onChange={(event) => setDraftField("status", event.target.value as ProductStatus)}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </AdminField>
            <AdminField label="Price DZD">
              <input inputMode="numeric" placeholder="2900" value={draft.priceDzd} onChange={(event) => setDraftField("priceDzd", event.target.value)} />
            </AdminField>
            <AdminField label="Compare at price" helper="Optional old price for promo display.">
              <input inputMode="numeric" placeholder="3500" value={draft.compareAtPriceDzd} onChange={(event) => setDraftField("compareAtPriceDzd", event.target.value)} />
            </AdminField>
          </div>

          <AdminField label="Description" helper="Short product description for product pages.">
            <textarea placeholder="Built for daily movement..." value={draft.description} onChange={(event) => setDraftField("description", event.target.value)} />
          </AdminField>

          <AdminField label="Images" helper="One URL/path per line. Example: /tshirt.png. At least one image is required.">
            <textarea placeholder="/tshirt.png" value={draft.imagesText} onChange={(event) => setDraftField("imagesText", event.target.value)} />
          </AdminField>

          <div className="adminFormGrid">
            <AdminField label="Colors" helper="One per line: Black|#111111">
              <textarea placeholder={'Black|#111111\nCream|#f5f1e8'} value={draft.colorsText} onChange={(event) => setDraftField("colorsText", event.target.value)} />
            </AdminField>
            <AdminField label="Sizes" helper="Comma-separated: S, M, L, XL. Leave empty for accessories.">
              <input placeholder="S, M, L, XL" value={draft.sizesText} onChange={(event) => setDraftField("sizesText", event.target.value)} />
            </AdminField>
            <AdminField label="Stock mode">
              <select value={draft.stockMode} onChange={(event) => setDraftField("stockMode", event.target.value as "unlimited" | "limited")}>
                <option value="unlimited">Unlimited</option>
                <option value="limited">Limited</option>
              </select>
            </AdminField>
            <AdminField label="Stock quantity" helper="Only required when stock mode is limited.">
              <input inputMode="numeric" placeholder="25" value={draft.stockQty} onChange={(event) => setDraftField("stockQty", event.target.value)} />
            </AdminField>
            <AdminField label="Sort order">
              <input inputMode="numeric" placeholder="100" value={draft.sortOrder} onChange={(event) => setDraftField("sortOrder", event.target.value)} />
            </AdminField>
            <AdminField label="Featured sort order" helper="Optional order for Featured Drop.">
              <input inputMode="numeric" placeholder="10" value={draft.featuredSortOrder} onChange={(event) => setDraftField("featuredSortOrder", event.target.value)} />
            </AdminField>
            <AdminField label="Look group slug" helper="Future Shop The Look grouping.">
              <input placeholder="summer-road" value={draft.lookGroupSlug} onChange={(event) => setDraftField("lookGroupSlug", event.target.value)} />
            </AdminField>
          </div>

          <div className="adminCheckboxGrid">
            <label><input type="checkbox" checked={draft.inStock} onChange={(event) => setDraftField("inStock", event.target.checked)} /> <span>In stock</span></label>
            <label><input type="checkbox" checked={draft.isPromo} onChange={(event) => setDraftField("isPromo", event.target.checked)} /> <span>Promo</span></label>
            <label><input type="checkbox" checked={draft.showInDrop001} onChange={(event) => setDraftField("showInDrop001", event.target.checked)} /> <span>Show in DROP_001</span></label>
            <label><input type="checkbox" checked={draft.showInFeaturedDrop} onChange={(event) => setDraftField("showInFeaturedDrop", event.target.checked)} /> <span>Show in Featured Drop</span></label>
            <label><input type="checkbox" checked={draft.showInShopTheLook} onChange={(event) => setDraftField("showInShopTheLook", event.target.checked)} /> <span>Prepare for Shop The Look</span></label>
          </div>

          <div className="adminActionsRow">
            <button className="adminPrimary" type="submit">{editingId ? "Save changes" : "Create product"}</button>
            {editingId ? <button type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft); }}>Cancel edit</button> : null}
          </div>
        </form>

        <section className="adminTable adminCard">
          <div className="adminCard__heading">
            <p>PRODUCTS</p>
            <h2>Product list</h2>
            <span>Limited paginated admin view. Archive hides products from the storefront.</span>
          </div>
          {products.map((product) => (
            <article key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <small>{product.slug}</small>
              </div>
              <span className={`adminStatus adminStatus--${product.status}`}>{product.status}</span>
              <span>{product.category} / {product.priceDzd} DZD</span>
              <div>
                <button type="button" onClick={() => editProduct(product)}>Edit</button>
                <button type="button" onClick={() => archiveProduct(product.id)}>Archive</button>
              </div>
            </article>
          ))}
          {nextCursor ? <button type="button" onClick={() => loadProducts(nextCursor)}>Load more</button> : null}
        </section>
      </div>
    </AdminShell>
  );
}

function AdminField({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) {
  return (
    <label className="adminField">
      <span>{label}</span>
      {children}
      {helper ? <small>{helper}</small> : null}
    </label>
  );
}

function formatAdminError(error: unknown): string {
  const fallback = "Product save failed. Check the highlighted fields and try again.";

  if (!(error instanceof Error)) return fallback;

  try {
    const parsed = JSON.parse(error.message) as { error?: unknown; issues?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> } };
    if (typeof parsed.error === "string" && parsed.error !== "Invalid product input") return parsed.error;
    const fieldErrors = parsed.issues?.fieldErrors;
    if (fieldErrors) {
      const firstEntry = Object.entries(fieldErrors).find(([, messages]) => messages.length > 0);
      if (firstEntry) return `${firstEntry[0]}: ${firstEntry[1][0]}`;
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
    images: draft.imagesText.split("\n").map((url) => url.trim()).filter(Boolean).map((url) => ({ url, alt: draft.name })),
    colors: draft.colorsText
      .split("\n")
      .map((line) => line.split("|"))
      .filter(([name, hex]) => name?.trim() && hex?.trim())
      .map(([name, hex]) => ({ name: name.trim(), hex: hex.trim() })),
    sizes: draft.sizesText.split(",").map((label) => label.trim()).filter(Boolean).map((label) => ({ label })),
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
