"use client";

import type { Auth, User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
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
      setMessage(error instanceof Error ? error.message : "Product save failed.");
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
      <AdminShell>
        <section className="adminLoginCard">
          {missingClientEnv.length ? <p className="accountMenu__message">Missing client env: {missingClientEnv.join(", ")}</p> : null}
          {missingServerEnv.length ? <p className="accountMenu__message">Missing server env: {missingServerEnv.join(", ")}</p> : null}
          <button className="adminPrimary" type="button" onClick={signInWithGoogle} disabled={!clientAuth || Boolean(missingClientEnv.length)}>
            Sign in with Google
          </button>
          <form className="adminEmailLogin" onSubmit={signInWithEmail}>
            <input type="email" placeholder="Admin email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <input type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <button type="submit" disabled={!clientAuth || Boolean(missingClientEnv.length)}>Sign in with email</button>
          </form>
          <p>{message}</p>
        </section>
      </AdminShell>
    );
  }

  if (!isAuthorized) {
    return (
      <AdminShell>
        <div className="adminTopbar">
          <p>Signed in as {user.email}</p>
          <button type="button" onClick={signOutAdmin}>Sign out</button>
        </div>
        <p className="adminMessage">{message}</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="adminTopbar">
        <p>Signed in as {user.email}</p>
        <button type="button" onClick={signOutAdmin}>Sign out</button>
      </div>
      <p className="adminMessage">{message}</p>

      <form className="adminForm" onSubmit={saveProduct}>
        <h2>{title}</h2>
        <input placeholder="Name" value={draft.name} onChange={(event) => setDraftField("name", event.target.value)} />
        <input placeholder="slug-example" value={draft.slug} onChange={(event) => setDraftField("slug", event.target.value)} />
        <textarea placeholder="Description" value={draft.description} onChange={(event) => setDraftField("description", event.target.value)} />
        <select value={draft.category} onChange={(event) => setDraftField("category", event.target.value as ProductCategory)}>
          <option value="tshirts">T-Shirts</option>
          <option value="pants">Pants</option>
          <option value="hoodies">Hoodies</option>
          <option value="accessories">Accessories</option>
        </select>
        <input placeholder="Price DZD" value={draft.priceDzd} onChange={(event) => setDraftField("priceDzd", event.target.value)} />
        <input placeholder="Compare at price optional" value={draft.compareAtPriceDzd} onChange={(event) => setDraftField("compareAtPriceDzd", event.target.value)} />
        <textarea placeholder="Images, one URL/path per line" value={draft.imagesText} onChange={(event) => setDraftField("imagesText", event.target.value)} />
        <textarea placeholder="Colors, one per line: Black|#111111" value={draft.colorsText} onChange={(event) => setDraftField("colorsText", event.target.value)} />
        <input placeholder="Sizes comma separated" value={draft.sizesText} onChange={(event) => setDraftField("sizesText", event.target.value)} />
        <select value={draft.status} onChange={(event) => setDraftField("status", event.target.value as ProductStatus)}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <select value={draft.stockMode} onChange={(event) => setDraftField("stockMode", event.target.value as "unlimited" | "limited")}>
          <option value="unlimited">Unlimited</option>
          <option value="limited">Limited</option>
        </select>
        <input placeholder="Stock qty optional" value={draft.stockQty} onChange={(event) => setDraftField("stockQty", event.target.value)} />
        <input placeholder="Sort order" value={draft.sortOrder} onChange={(event) => setDraftField("sortOrder", event.target.value)} />
        <input placeholder="Featured sort order optional" value={draft.featuredSortOrder} onChange={(event) => setDraftField("featuredSortOrder", event.target.value)} />
        <input placeholder="Look group slug optional" value={draft.lookGroupSlug} onChange={(event) => setDraftField("lookGroupSlug", event.target.value)} />
        <label><input type="checkbox" checked={draft.inStock} onChange={(event) => setDraftField("inStock", event.target.checked)} /> In stock</label>
        <label><input type="checkbox" checked={draft.isPromo} onChange={(event) => setDraftField("isPromo", event.target.checked)} /> Promo</label>
        <label><input type="checkbox" checked={draft.showInDrop001} onChange={(event) => setDraftField("showInDrop001", event.target.checked)} /> Show in DROP_001</label>
        <label><input type="checkbox" checked={draft.showInFeaturedDrop} onChange={(event) => setDraftField("showInFeaturedDrop", event.target.checked)} /> Show in Featured Drop</label>
        <label><input type="checkbox" checked={draft.showInShopTheLook} onChange={(event) => setDraftField("showInShopTheLook", event.target.checked)} /> Prepare for Shop The Look</label>
        <button className="adminPrimary" type="submit">{editingId ? "Save changes" : "Create product"}</button>
        {editingId ? <button type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft); }}>Cancel edit</button> : null}
      </form>

      <section className="adminTable">
        <h2>Products</h2>
        {products.map((product) => (
          <article key={product.id}>
            <strong>{product.name}</strong>
            <span>{product.status} / {product.category} / {product.priceDzd} DZD</span>
            <div>
              <button type="button" onClick={() => editProduct(product)}>Edit</button>
              <button type="button" onClick={() => archiveProduct(product.id)}>Archive</button>
            </div>
          </article>
        ))}
        {nextCursor ? <button type="button" onClick={() => loadProducts(nextCursor)}>Load more</button> : null}
      </section>
    </AdminShell>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="adminPage">
      <header>
        <p>213 RUN ADMIN</p>
        <h1>Products</h1>
      </header>
      {children}
    </main>
  );
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
