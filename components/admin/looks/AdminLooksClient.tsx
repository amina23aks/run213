"use client";

import Image from "next/image";
import type { User } from "firebase/auth";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatDzd } from "@/constants/products";
import { getMissingFirebaseClientEnv } from "@/lib/env";
import type { Look, LookCollection } from "@/types/look";
import type { Product } from "@/types/product";

type LookList = { items: Look[] };
type CollectionList = { items: LookCollection[] };
type ProductList = { products: Product[] };
type LookDraft = typeof emptyDraft;
type FieldErrors = Partial<Record<keyof LookDraft | "summary", string>>;

const missingClientEnv = getMissingFirebaseClientEnv();
const emptyDraft = { collectionId: "", collectionSlug: "", name: "", numberLabel: "", description: "", priceDzd: "", compareAtPriceDzd: "", heroImageUrl: "", heroImagePublicId: "", figureImageUrl: "", figureImagePublicId: "", productIds: [] as string[], status: "draft", sortOrder: "", showAsHomepageFigure: false, homepageFigureOrder: "" };

export function AdminLooksClient() {
  const [user, setUser] = useState<User | null>(null);
  const [looks, setLooks] = useState<Look[]>([]);
  const [collections, setCollections] = useState<LookCollection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("Sign in with an approved admin email.");
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [productQuery, setProductQuery] = useState("");
  const activeProducts = useMemo(() => products.filter((product) => product.status === "active"), [products]);
  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    return activeProducts.filter((product) => !query || [product.name, product.category].some((value) => value.toLowerCase().includes(query)));
  }, [activeProducts, productQuery]);
  const slugPreview = slugify(`${draft.collectionSlug}-${draft.name}-${draft.numberLabel}`);
  const selectedProductTotalDzd = useMemo(() => draft.productIds.reduce((sum, id) => sum + (products.find((product) => product.id === id)?.priceDzd ?? 0), 0), [draft.productIds, products]);
  const lookPriceDzd = Number(draft.priceDzd || 0);
  const lookSavingDzd = Math.max(0, selectedProductTotalDzd - lookPriceDzd);
  const derivedLookCompareAtPriceDzd = lookSavingDzd > 0 ? selectedProductTotalDzd : null;

  const adminFetch = useCallback(async (path: string, init?: RequestInit, authUser = user) => {
    const token = await authUser?.getIdToken();
    const response = await fetch(path, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...init?.headers } });
    if (!response.ok) throw new Error(formatApiError(await response.text()));
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

  function patchDraft(patch: Partial<LookDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors({});
  }

  function showToast(nextMessage: string) {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage((current) => current === nextMessage ? "" : current), 3500);
  }

  async function upload(file: File, target: "hero" | "figure" = "hero") {
    setUploading(true);
    try {
      const body = new FormData(); body.append("file", file); body.append("kind", "lookHero");
      const data = await adminFetch("/api/admin/uploads/image", { method: "POST", body }) as { secureUrl?: string; publicId?: string };
      if (!data.secureUrl) throw new Error("Upload failed.");
      if (target === "figure") patchDraft({ figureImageUrl: data.secureUrl, figureImagePublicId: data.publicId ?? "" });
      else patchDraft({ heroImageUrl: data.secureUrl, heroImagePublicId: data.publicId ?? "" });
    } catch (error) { setErrors({ [target === "figure" ? "figureImageUrl" : "heroImageUrl"]: error instanceof Error ? error.message : "Upload failed." }); }
    finally { setUploading(false); }
  }

  async function save() {
    const validation = validateDraft(draft);
    setErrors(validation.errors);
    if (!validation.ok) return;
    const collection = collections.find((item) => item.id === draft.collectionId);
    const collectionSlug = collection?.slug ?? draft.collectionSlug;
    const body = JSON.stringify({ collectionId: draft.collectionId, collectionSlug, slug: slugPreview, name: draft.name, numberLabel: draft.numberLabel, description: draft.description, priceDzd: draft.priceDzd, compareAtPriceDzd: derivedLookCompareAtPriceDzd, heroImage: { url: draft.heroImageUrl, alt: draft.name, publicId: draft.heroImagePublicId || undefined }, figureImage: draft.figureImageUrl ? { url: draft.figureImageUrl, alt: draft.name, publicId: draft.figureImagePublicId || undefined } : null, productIds: draft.productIds, status: draft.status, sortOrder: editingId ? toInteger(draft.sortOrder) ?? 1 : null, showAsHomepageFigure: draft.showAsHomepageFigure, homepageFigureOrder: editingId ? validation.homepageFigureOrder : null });
    try { await adminFetch(editingId ? `/api/admin/looks/${editingId}` : "/api/admin/looks", { method: editingId ? "PUT" : "POST", body }); setDraft(emptyDraft); setEditingId(null); await load(); showToast("Look saved."); }
    catch (error) { setErrors({ summary: error instanceof Error ? error.message : "Save failed." }); }
  }

  async function archive(id: string) { try { await adminFetch(`/api/admin/looks/${id}`, { method: "DELETE" }); await load(); showToast("Look archived."); } catch { setErrors({ summary: "Archive failed." }); } }
  function edit(look: Look) { setEditingId(look.id); setDraft({ collectionId: look.collectionId, collectionSlug: look.collectionSlug, name: look.name, numberLabel: look.numberLabel ?? "", description: look.description, priceDzd: String(look.priceDzd || ""), compareAtPriceDzd: look.compareAtPriceDzd ? String(look.compareAtPriceDzd) : "", heroImageUrl: look.heroImage.url, heroImagePublicId: look.heroImage.publicId ?? "", figureImageUrl: look.figureImage?.url ?? "", figureImagePublicId: look.figureImage?.publicId ?? "", productIds: look.productIds, status: look.status === "active" ? "active" : "draft", sortOrder: String(look.sortOrder), showAsHomepageFigure: look.showAsHomepageFigure, homepageFigureOrder: look.homepageFigureOrder === null ? "" : String(look.homepageFigureOrder) }); setErrors({}); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function toggleProduct(id: string) { patchDraft({ productIds: draft.productIds.includes(id) ? draft.productIds.filter((item) => item !== id) : [...draft.productIds, id] }); }
  function moveProduct(id: string, direction: -1 | 1) { const index = draft.productIds.indexOf(id); const nextIndex = index + direction; if (index < 0 || nextIndex < 0 || nextIndex >= draft.productIds.length) return; const next = [...draft.productIds]; [next[index], next[nextIndex]] = [next[nextIndex], next[index]]; patchDraft({ productIds: next }); }

  return <AdminShell title="Looks" description="Build Shop The Look entries from real active products.">
    <div className="adminLookWorkspace">
      <section className="adminCard adminLookEditor"><div className="adminCard__heading"><p>LOOKS</p><h2>{editingId ? "Edit look" : "Create look"}</h2><span>{message}</span></div>
        {errors.summary ? <p className="adminFormAlert">{errors.summary}</p> : null}
        <AdminLookSection number="01" title="Collection and name"><div className="adminProductGrid adminProductGrid--two"><AdminLookField label="Collection" error={errors.collectionId}><select value={draft.collectionId} onChange={(event) => { const collection = collections.find((item) => item.id === event.target.value); patchDraft({ collectionId: event.target.value, collectionSlug: collection?.slug ?? "" }); }}><option value="">Choose collection</option>{collections.filter((item) => item.status !== "archived").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></AdminLookField><AdminLookField label="Look name" error={errors.name}><input placeholder="City Everyday" value={draft.name} onChange={(event) => patchDraft({ name: event.target.value })} /></AdminLookField></div><div className="adminProductGrid adminProductGrid--two"><AdminLookField label="Slug preview"><input value={slugPreview || "choose-collection-look-name"} readOnly /></AdminLookField><AdminLookField label="Number label"><input placeholder="LOOK 01" value={draft.numberLabel} onChange={(event) => patchDraft({ numberLabel: event.target.value })} /></AdminLookField></div><AdminLookField label="Description"><textarea rows={3} placeholder="Clean silhouettes designed to move with you." value={draft.description} onChange={(event) => patchDraft({ description: event.target.value })} /></AdminLookField><div className="adminProductGrid adminProductGrid--two"><AdminLookField label="Look Selling Price" error={errors.priceDzd}><input inputMode="numeric" placeholder="5500" value={draft.priceDzd} onChange={(event) => patchDraft({ priceDzd: event.target.value })} /></AdminLookField></div>{selectedProductTotalDzd > 0 ? <div className="adminPricingStats"><span>Sum of Selected Product Prices: {formatDzd(selectedProductTotalDzd)}</span><span>Look Price: {formatDzd(lookPriceDzd)}</span><span>Customer Saving: {formatDzd(lookSavingDzd)}</span></div> : null}</AdminLookSection>
        <AdminLookSection number="02" title="Status"><div className="adminPillGroup">{(["draft", "active"] as const).map((status) => <button className={draft.status === status ? "isSelected" : undefined} type="button" key={status} onClick={() => patchDraft({ status })}>{status}</button>)}</div></AdminLookSection>
        <AdminLookSection number="03" title="Hero / figure image"><p className="adminProductHint">Hero image is used on the Collection and final Look pages. Optional figure image is used only in the homepage figure row.</p><label className="adminUploadButton"><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} /><span>{uploading ? "Uploading…" : draft.heroImageUrl ? "Replace hero image" : "Upload hero image"}</span></label>{errors.heroImageUrl ? <small className="adminInlineError">{errors.heroImageUrl}</small> : null}{draft.heroImageUrl ? <figure className="adminLookPreview adminLookPreview--portrait"><Image src={draft.heroImageUrl} alt="Look hero preview" width={160} height={210} unoptimized /><button type="button" onClick={() => patchDraft({ heroImageUrl: "", heroImagePublicId: "" })}>Remove image</button></figure> : null}<label className="adminUploadButton"><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file, "figure"); }} /><span>{uploading ? "Uploading…" : draft.figureImageUrl ? "Replace homepage figure image" : "Optional homepage figure image"}</span></label>{errors.figureImageUrl ? <small className="adminInlineError">{errors.figureImageUrl}</small> : null}{draft.figureImageUrl ? <figure className="adminLookPreview adminLookPreview--portrait"><Image src={draft.figureImageUrl} alt="Homepage figure preview" width={160} height={210} unoptimized /><button type="button" onClick={() => patchDraft({ figureImageUrl: "", figureImagePublicId: "" })}>Remove figure image</button></figure> : null}</AdminLookSection>
        <AdminLookSection number="04" title="Homepage figure"><label className="adminToggleCard"><input type="checkbox" checked={draft.showAsHomepageFigure} onChange={(event) => patchDraft({ showAsHomepageFigure: event.target.checked })} /><span>Show this Look in the homepage figure row</span></label><p className="adminProductHint">New homepage figures are appended automatically after the current last figure.</p></AdminLookSection>
        <AdminLookSection number="05" title="Products in this Look"><AdminLookField label="Search products"><input placeholder="Search by product or category" value={productQuery} onChange={(event) => setProductQuery(event.target.value)} /></AdminLookField>{errors.productIds ? <p className="adminInlineError">{errors.productIds}</p> : null}<div className="adminLookProductPicker">{filteredProducts.map((product) => <button className={draft.productIds.includes(product.id) ? "isSelected" : undefined} type="button" key={product.id} onClick={() => toggleProduct(product.id)}>{product.images[0]?.url ? <Image src={product.images[0].url} alt={product.name} width={56} height={64} unoptimized /> : null}<span><strong>{product.name}</strong><small>{product.category} · {formatDzd(product.priceDzd)} · {product.stockMode === "limited" ? `${product.stockQty ?? 0} left` : "In stock"}</small></span><em>{draft.productIds.includes(product.id) ? "Remove" : "Add"}</em></button>)}</div><div className="adminSelectedProducts">{draft.productIds.map((id, index) => { const product = products.find((item) => item.id === id); return <article key={id}><span>{index + 1}</span>{product?.images[0]?.url ? <Image src={product.images[0].url} alt={product.name} width={56} height={64} unoptimized /> : null}<strong>{product?.name ?? id}</strong><button type="button" onClick={() => moveProduct(id, -1)}>Move up</button><button type="button" onClick={() => moveProduct(id, 1)}>Move down</button><button type="button" onClick={() => toggleProduct(id)}>Remove</button></article>; })}</div></AdminLookSection>
        <div className="adminProductActions"><button className="adminPrimary" type="button" onClick={save}>Save Look</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft); }}>Cancel edit</button> : null}</div>
      </section>
      <section className="adminCard"><div className="adminCard__heading"><p>LOOK LIST</p><h2>Looks</h2></div><div className="adminLookList">{looks.map((look) => <article className="adminLookRow" key={look.id}><Image src={look.heroImage.url} alt={look.heroImage.alt} width={72} height={72} unoptimized /><div><strong>{look.numberLabel ? `${look.numberLabel} · ` : ""}{look.name}</strong><span>{look.collectionSlug} · {look.status} · {look.productIds.length} products {look.showAsHomepageFigure ? "· Homepage figure" : ""}</span></div><button type="button" onClick={() => edit(look)}>Edit</button>{look.status === "archived" ? <span>Archived</span> : <button type="button" onClick={() => archive(look.id)}>Archive</button>}</article>)}</div></section>
    </div>
  </AdminShell>;
}

function validateDraft(draft: LookDraft): { ok: boolean; errors: FieldErrors; homepageFigureOrder: number | null } {
  const errors: FieldErrors = {};
  let homepageFigureOrder: number | null = null;
  if (!draft.collectionId) errors.collectionId = "Choose a collection.";
  if (!draft.name.trim()) errors.name = "Enter a Look name.";
  if (toInteger(draft.priceDzd) === null || (toInteger(draft.priceDzd) ?? 0) <= 0) errors.priceDzd = "Enter a Look price greater than 0 DZD.";
  if (draft.status === "active" && !draft.heroImageUrl) errors.heroImageUrl = "Upload a hero image before activating this Look.";
  if (draft.status === "active" && !draft.productIds.length) errors.productIds = "Select at least one active product.";
  if (draft.showAsHomepageFigure) {
    homepageFigureOrder = toInteger(draft.homepageFigureOrder);
  }
  return { ok: Object.keys(errors).length === 0, errors, homepageFigureOrder };
}

function toInteger(value: string): number | null { const numberValue = Number(value); return Number.isFinite(numberValue) ? Math.max(0, Math.trunc(numberValue)) : null; }
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }
function formatApiError(raw: string) { try { const parsed = JSON.parse(raw) as { error?: string; issues?: { fieldErrors?: Record<string, string[]> } }; const firstField = parsed.issues?.fieldErrors ? Object.values(parsed.issues.fieldErrors)[0]?.[0] : null; return firstField ?? parsed.error ?? "Save failed."; } catch { return raw || "Save failed."; } }
function AdminLookSection({ number, title, children }: { number: string; title: string; children: ReactNode }) { return <section className="adminLookSection"><header><span>{number}</span><h3>{title}</h3></header>{children}</section>; }
function AdminLookField({ label, helper, error, children }: { label: string; helper?: string; error?: string; children: ReactNode }) { return <label className="adminLookField"><span>{label}</span>{children}{helper ? <small>{helper}</small> : null}{error ? <small className="adminInlineError">{error}</small> : null}</label>; }
