"use client";

import Image from "next/image";
import type { User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getMissingFirebaseClientEnv } from "@/lib/env";
import type { Look, LookCollection } from "@/types/look";
import type { Product } from "@/types/product";

type LookList = { items: Look[] };
type CollectionList = { items: LookCollection[] };
type ProductList = { products: Product[] };
const missingClientEnv = getMissingFirebaseClientEnv();
const emptyDraft = { collectionId: "", collectionSlug: "", name: "", numberLabel: "", description: "", heroImageUrl: "", heroImagePublicId: "", productIds: [] as string[], status: "draft", sortOrder: "10", showAsHomepageFigure: false, homepageFigureOrder: "" };

export function AdminLooksClient() {
  const [user, setUser] = useState<User | null>(null);
  const [looks, setLooks] = useState<Look[]>([]);
  const [collections, setCollections] = useState<LookCollection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("Sign in with an approved admin email.");
  const [uploading, setUploading] = useState(false);
  const activeProducts = useMemo(() => products.filter((product) => product.status === "active"), [products]);

  const adminFetch = useCallback(async (path: string, init?: RequestInit, authUser = user) => {
    const token = await authUser?.getIdToken();
    const response = await fetch(path, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...init?.headers } });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }, [user]);

  const load = useCallback(async (authUser = user) => {
    try {
      const [lookData, collectionData, productData] = await Promise.all([
        adminFetch("/api/admin/looks", undefined, authUser) as Promise<LookList>,
        adminFetch("/api/admin/look-collections", undefined, authUser) as Promise<CollectionList>,
        adminFetch("/api/admin/products?limit=50", undefined, authUser) as Promise<ProductList>,
      ]);
      setLooks(lookData.items); setCollections(collectionData.items); setProducts(productData.products); setMessage("");
    } catch { setMessage("Access denied or Firebase admin env is missing."); }
  }, [adminFetch, user]);

  useEffect(() => {
    if (missingClientEnv.length) return;
    let unsubscribe: (() => void) | undefined;
    Promise.all([import("@/lib/firebase/client"), import("firebase/auth")]).then(([client, authModule]) => {
      unsubscribe = authModule.onAuthStateChanged(client.auth, (nextUser) => { setUser(nextUser); if (nextUser) void load(nextUser); });
    }).catch(() => setMessage("Firebase client env is missing."));
    return () => unsubscribe?.();
  }, [load]);

  async function upload(file: File) {
    setUploading(true);
    try {
      const body = new FormData(); body.append("file", file); body.append("kind", "lookHero");
      const data = await adminFetch("/api/admin/uploads/image", { method: "POST", body }) as { secureUrl?: string; publicId?: string };
      if (!data.secureUrl) throw new Error("Upload failed.");
      setDraft((current) => ({ ...current, heroImageUrl: data.secureUrl ?? "", heroImagePublicId: data.publicId ?? "" }));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed."); }
    finally { setUploading(false); }
  }

  async function save() {
    const collection = collections.find((item) => item.id === draft.collectionId);
    const collectionSlug = collection?.slug ?? draft.collectionSlug;
    const body = JSON.stringify({ collectionId: draft.collectionId, collectionSlug, slug: slugify(`${collectionSlug}-${draft.name}-${draft.numberLabel}`), name: draft.name, numberLabel: draft.numberLabel, description: draft.description, heroImage: { url: draft.heroImageUrl, alt: draft.name, publicId: draft.heroImagePublicId || undefined }, productIds: draft.productIds, status: draft.status, sortOrder: draft.sortOrder, showAsHomepageFigure: draft.showAsHomepageFigure, homepageFigureOrder: draft.homepageFigureOrder });
    try { await adminFetch(editingId ? `/api/admin/looks/${editingId}` : "/api/admin/looks", { method: editingId ? "PUT" : "POST", body }); setDraft(emptyDraft); setEditingId(null); await load(); setMessage("Look saved."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Save failed."); }
  }

  async function archive(id: string) { try { await adminFetch(`/api/admin/looks/${id}`, { method: "DELETE" }); await load(); setMessage("Look archived."); } catch { setMessage("Archive failed."); } }
  function edit(look: Look) { setEditingId(look.id); setDraft({ collectionId: look.collectionId, collectionSlug: look.collectionSlug, name: look.name, numberLabel: look.numberLabel ?? "", description: look.description, heroImageUrl: look.heroImage.url, heroImagePublicId: look.heroImage.publicId ?? "", productIds: look.productIds, status: look.status === "active" ? "active" : "draft", sortOrder: String(look.sortOrder), showAsHomepageFigure: look.showAsHomepageFigure, homepageFigureOrder: look.homepageFigureOrder === null ? "" : String(look.homepageFigureOrder) }); }
  function toggleProduct(id: string) { setDraft((current) => ({ ...current, productIds: current.productIds.includes(id) ? current.productIds.filter((item) => item !== id) : [...current.productIds, id] })); }
  function moveProduct(id: string, direction: -1 | 1) { setDraft((current) => { const index = current.productIds.indexOf(id); const nextIndex = index + direction; if (index < 0 || nextIndex < 0 || nextIndex >= current.productIds.length) return current; const next = [...current.productIds]; [next[index], next[nextIndex]] = [next[nextIndex], next[index]]; return { ...current, productIds: next }; }); }

  return <AdminShell title="Looks" description="Build Shop The Look entries from real active products.">
    <section className="adminCard adminLookEditor"><div className="adminCard__heading"><p>LOOKS</p><h2>{editingId ? "Edit look" : "Create look"}</h2><span>{message}</span></div>
      <div className="adminProductGrid adminProductGrid--three"><select value={draft.collectionId} onChange={(event) => { const collection = collections.find((item) => item.id === event.target.value); setDraft({ ...draft, collectionId: event.target.value, collectionSlug: collection?.slug ?? "" }); }}><option value="">Choose collection</option>{collections.filter((item) => item.status !== "archived").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input placeholder="CITY EVERYDAY" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /><input placeholder="LOOK 02" value={draft.numberLabel} onChange={(event) => setDraft({ ...draft, numberLabel: event.target.value })} /></div>
      <textarea rows={3} placeholder="Description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
      <div className="adminProductGrid adminProductGrid--three"><input inputMode="numeric" placeholder="Sort" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} /><div className="adminPillGroup">{(["draft", "active"] as const).map((status) => <button className={draft.status === status ? "isSelected" : undefined} type="button" key={status} onClick={() => setDraft({ ...draft, status })}>{status}</button>)}</div><label className="adminUploadButton"><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} /><span>{uploading ? "Uploading…" : "Upload hero image"}</span></label></div>
      {draft.heroImageUrl ? <Image className="adminLookThumb" src={draft.heroImageUrl} alt="Look hero" width={120} height={120} unoptimized /> : null}
      <div className="adminProductGrid adminProductGrid--two"><label className="adminToggleCard"><input type="checkbox" checked={draft.showAsHomepageFigure} onChange={(event) => setDraft({ ...draft, showAsHomepageFigure: event.target.checked })} /><span>Show as homepage figure</span></label><input inputMode="numeric" placeholder="Homepage figure order" value={draft.homepageFigureOrder} onChange={(event) => setDraft({ ...draft, homepageFigureOrder: event.target.value })} /></div>
      <div className="adminLookProductPicker">{activeProducts.map((product) => <button className={draft.productIds.includes(product.id) ? "isSelected" : undefined} type="button" key={product.id} onClick={() => toggleProduct(product.id)}>{product.images[0]?.url ? <Image src={product.images[0].url} alt={product.name} width={44} height={52} unoptimized /> : null}<span>{product.name}</span></button>)}</div>
      <div className="adminSelectedPreview"><span>Selected products</span>{draft.productIds.map((id) => { const product = products.find((item) => item.id === id); return <i key={id}>{product?.name ?? id}<button type="button" onClick={() => moveProduct(id, -1)}>↑</button><button type="button" onClick={() => moveProduct(id, 1)}>↓</button></i>; })}</div>
      <div className="adminProductActions"><button className="adminPrimary" type="button" onClick={save}>Save look</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft); }}>Cancel</button> : null}</div>
    </section>
    <section className="adminCard"><div className="adminCard__heading"><p>LOOK LIST</p><h2>Looks</h2></div><div className="adminLookList">{looks.map((look) => <article className="adminLookRow" key={look.id}><Image src={look.heroImage.url} alt={look.heroImage.alt} width={72} height={72} unoptimized /><div><strong>{look.numberLabel ? `${look.numberLabel} · ` : ""}{look.name}</strong><span>{look.status} · {look.slug}</span></div><button type="button" onClick={() => edit(look)}>Edit</button>{look.status === "archived" ? <span>Archived</span> : <button type="button" onClick={() => archive(look.id)}>Archive</button>}</article>)}</div></section>
  </AdminShell>;
}

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }
