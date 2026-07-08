"use client";

import type { Auth, User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Product, ProductCategory, ProductStatus, ProductStockMode } from "@/types/product";

type ProductDraft = {
  name: string; slug: string; description: string; category: ProductCategory; priceDzd: string; compareAtPriceDzd: string;
  imagesText: string; colorsText: string; sizesText: string; status: ProductStatus; inStock: boolean; stockMode: Extract<ProductStockMode, "unlimited" | "limited">;
  stockQty: string; isPromo: boolean; dropSlug: "drop-001" | ""; sortOrder: string; showInDrop001: boolean; showInFeaturedDrop: boolean;
  showInShopTheLook: boolean; featuredSortOrder: string; lookGroupSlug: string;
};

const emptyDraft: ProductDraft = { name: "", slug: "", description: "", category: "tshirts", priceDzd: "", compareAtPriceDzd: "", imagesText: "", colorsText: "Black|#111111", sizesText: "S, M, L, XL", status: "draft", inStock: true, stockMode: "unlimited", stockQty: "", isPromo: false, dropSlug: "drop-001", sortOrder: "100", showInDrop001: false, showInFeaturedDrop: false, showInShopTheLook: false, featuredSortOrder: "", lookGroupSlug: "" };

export function AdminProductsClient() {
  const [user, setUser] = useState<User | null>(null);
  const [clientAuth, setClientAuth] = useState<Auth | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("Sign in with an approved admin email.");

  const adminFetch = useCallback(async (url: string, init?: RequestInit) => {
    const token = await user?.getIdToken();
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers } });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }, [user]);

  const loadProducts = useCallback(async () => {
    try { const data = await adminFetch("/api/admin/products"); setProducts(data.products); setMessage("Products loaded."); }
    catch { setMessage("Access denied or Firebase admin env is missing."); }
  }, [adminFetch]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    Promise.all([import("@/lib/firebase/client"), import("firebase/auth")])
      .then(([client, authModule]) => {
        setClientAuth(client.auth);
        unsubscribe = authModule.onAuthStateChanged(client.auth, (nextUser) => {
          setUser(nextUser);
          if (nextUser) {
            nextUser.getIdToken()
              .then((token) => fetch("/api/admin/products", { headers: { Authorization: `Bearer ${token}` } }))
              .then((response) => response.ok ? response.json() : Promise.reject(new Error("Access denied")))
              .then((data) => { setProducts(data.products); setMessage("Products loaded."); })
              .catch(() => setMessage("Access denied or Firebase admin env is missing."));
          }
        });
      })
      .catch(() => setMessage("Firebase client env is missing."));

    return () => unsubscribe?.();
  }, []);

  const title = useMemo(() => editingId ? "Edit product" : "Create product", [editingId]);
  async function saveProduct(event: React.FormEvent) {
    event.preventDefault();
    try {
      const body = JSON.stringify(toPayload(draft));
      await adminFetch(editingId ? `/api/admin/products/${editingId}` : "/api/admin/products", { method: editingId ? "PUT" : "POST", body });
      setDraft(emptyDraft); setEditingId(null); await loadProducts(); setMessage("Product saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Product save failed."); }
  }
  async function signIn() {
    if (!clientAuth) return;
    const [{ signInWithPopup }, { googleProvider }] = await Promise.all([import("firebase/auth"), import("@/lib/firebase/client")]);
    await signInWithPopup(clientAuth, googleProvider);
  }
  async function signOutAdmin() {
    if (!clientAuth) return;
    const { signOut } = await import("firebase/auth");
    await signOut(clientAuth);
  }
  async function archiveProduct(id: string) {
    await adminFetch(`/api/admin/products/${id}`, { method: "DELETE" });
    await loadProducts(); setMessage("Product archived.");
  }
  function editProduct(product: Product) { setEditingId(product.id); setDraft(fromProduct(product)); window.scrollTo({ top: 0, behavior: "smooth" }); }

  if (!user) return <AdminShell><button className="adminPrimary" type="button" onClick={signIn} disabled={!clientAuth}>Sign in with Google</button><p>{message}</p></AdminShell>;

  return <AdminShell>
    <div className="adminTopbar"><p>Signed in as {user.email}</p><button type="button" onClick={signOutAdmin}>Sign out</button></div>
    <p className="adminMessage">{message}</p>
    <form className="adminForm" onSubmit={saveProduct}>
      <h2>{title}</h2>
      <input placeholder="Name" value={draft.name} onChange={(e) => setDraftField("name", e.target.value)} />
      <input placeholder="slug-example" value={draft.slug} onChange={(e) => setDraftField("slug", e.target.value)} />
      <textarea placeholder="Description" value={draft.description} onChange={(e) => setDraftField("description", e.target.value)} />
      <select value={draft.category} onChange={(e) => setDraftField("category", e.target.value as ProductCategory)}><option value="tshirts">T-Shirts</option><option value="pants">Pants</option><option value="hoodies">Hoodies</option><option value="accessories">Accessories</option></select>
      <input placeholder="Price DZD" value={draft.priceDzd} onChange={(e) => setDraftField("priceDzd", e.target.value)} />
      <input placeholder="Compare at price optional" value={draft.compareAtPriceDzd} onChange={(e) => setDraftField("compareAtPriceDzd", e.target.value)} />
      <textarea placeholder="Images, one URL/path per line" value={draft.imagesText} onChange={(e) => setDraftField("imagesText", e.target.value)} />
      <textarea placeholder="Colors, one per line: Black|#111111" value={draft.colorsText} onChange={(e) => setDraftField("colorsText", e.target.value)} />
      <input placeholder="Sizes comma separated" value={draft.sizesText} onChange={(e) => setDraftField("sizesText", e.target.value)} />
      <select value={draft.status} onChange={(e) => setDraftField("status", e.target.value as ProductStatus)}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select>
      <select value={draft.stockMode} onChange={(e) => setDraftField("stockMode", e.target.value as "unlimited" | "limited")}><option value="unlimited">Unlimited</option><option value="limited">Limited</option></select>
      <input placeholder="Stock qty optional" value={draft.stockQty} onChange={(e) => setDraftField("stockQty", e.target.value)} />
      <input placeholder="Sort order" value={draft.sortOrder} onChange={(e) => setDraftField("sortOrder", e.target.value)} />
      <input placeholder="Featured sort order optional" value={draft.featuredSortOrder} onChange={(e) => setDraftField("featuredSortOrder", e.target.value)} />
      <input placeholder="Look group slug optional" value={draft.lookGroupSlug} onChange={(e) => setDraftField("lookGroupSlug", e.target.value)} />
      <label><input type="checkbox" checked={draft.inStock} onChange={(e) => setDraftField("inStock", e.target.checked)} /> In stock</label>
      <label><input type="checkbox" checked={draft.isPromo} onChange={(e) => setDraftField("isPromo", e.target.checked)} /> Promo</label>
      <label><input type="checkbox" checked={draft.showInDrop001} onChange={(e) => setDraftField("showInDrop001", e.target.checked)} /> Show in DROP_001</label>
      <label><input type="checkbox" checked={draft.showInFeaturedDrop} onChange={(e) => setDraftField("showInFeaturedDrop", e.target.checked)} /> Show in Featured Drop</label>
      <label><input type="checkbox" checked={draft.showInShopTheLook} onChange={(e) => setDraftField("showInShopTheLook", e.target.checked)} /> Prepare for Shop The Look</label>
      <button className="adminPrimary" type="submit">{editingId ? "Save changes" : "Create product"}</button>
      {editingId ? <button type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft); }}>Cancel edit</button> : null}
    </form>
    <section className="adminTable"><h2>Products</h2>{products.map((product) => <article key={product.id}><strong>{product.name}</strong><span>{product.status} / {product.category} / {product.priceDzd} DZD</span><div><button type="button" onClick={() => editProduct(product)}>Edit</button><button type="button" onClick={() => archiveProduct(product.id)}>Archive</button></div></article>)}</section>
  </AdminShell>;

  function setDraftField<Key extends keyof ProductDraft>(key: Key, value: ProductDraft[Key]) { setDraft((current) => ({ ...current, [key]: value })); }
}

function AdminShell({ children }: { children: React.ReactNode }) { return <main className="adminPage"><header><p>213 RUN ADMIN</p><h1>Products</h1></header>{children}</main>; }
function toPayload(draft: ProductDraft) { return { name: draft.name, slug: draft.slug, description: draft.description, category: draft.category, priceDzd: draft.priceDzd, compareAtPriceDzd: draft.compareAtPriceDzd, images: draft.imagesText.split("\n").map((url) => url.trim()).filter(Boolean).map((url) => ({ url, alt: draft.name })), colors: draft.colorsText.split("\n").map((line) => line.split("|")).filter(([name, hex]) => name?.trim() && hex?.trim()).map(([name, hex]) => ({ name: name.trim(), hex: hex.trim() })), sizes: draft.sizesText.split(",").map((label) => label.trim()).filter(Boolean).map((label) => ({ label })), status: draft.status, inStock: draft.inStock, stockMode: draft.stockMode, stockQty: draft.stockQty, isPromo: draft.isPromo, dropSlug: draft.dropSlug, sortOrder: draft.sortOrder, showInDrop001: draft.showInDrop001, showInFeaturedDrop: draft.showInFeaturedDrop, showInShopTheLook: draft.showInShopTheLook, featuredSortOrder: draft.featuredSortOrder, lookGroupSlug: draft.lookGroupSlug }; }
function fromProduct(product: Product): ProductDraft { return { name: product.name, slug: product.slug, description: product.description, category: product.category, priceDzd: String(product.priceDzd), compareAtPriceDzd: product.compareAtPriceDzd ? String(product.compareAtPriceDzd) : "", imagesText: product.images.map((image) => image.url).join("\n"), colorsText: product.colors.map((color) => `${color.name}|${color.hex}`).join("\n"), sizesText: product.sizes.map((size) => size.label).join(", "), status: product.status, inStock: product.inStock, stockMode: product.stockMode === "limited" ? "limited" : "unlimited", stockQty: product.stockQty === null ? "" : String(product.stockQty), isPromo: product.isPromo, dropSlug: product.dropSlug ?? "", sortOrder: String(product.sortOrder), showInDrop001: product.showInDrop001, showInFeaturedDrop: product.showInFeaturedDrop, showInShopTheLook: product.showInShopTheLook, featuredSortOrder: product.featuredSortOrder === null ? "" : String(product.featuredSortOrder), lookGroupSlug: product.lookGroupSlug ?? "" }; }
