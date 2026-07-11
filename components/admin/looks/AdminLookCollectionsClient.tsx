"use client";

import Image from "next/image";
import type { User } from "firebase/auth";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getMissingFirebaseClientEnv } from "@/lib/env";
import type { LookCollection } from "@/types/look";

type ApiList = { items: LookCollection[] };
type CollectionDraft = typeof emptyDraft;
type FieldErrors = Partial<Record<keyof CollectionDraft | "summary", string>>;
const missingClientEnv = getMissingFirebaseClientEnv();
const COLLECTION_SLOTS = [
  { order: 1, label: "01 Summer Road" },
  { order: 2, label: "02 City Everyday" },
  { order: 3, label: "03 Evening Layer" },
  { order: 4, label: "04 Essential Layers" },
] as const;
const emptyDraft = { name: "", subtitle: "", description: "", status: "draft", sortOrder: "1", cardImageUrl: "", cardImagePublicId: "" };

export function AdminLookCollectionsClient() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<LookCollection[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("Sign in with an approved admin email.");
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const slugPreview = useMemo(() => slugify(draft.name), [draft.name]);

  const adminFetch = useCallback(async (path: string, init?: RequestInit, authUser = user) => {
    const token = await authUser?.getIdToken();
    const response = await fetch(path, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...init?.headers } });
    if (!response.ok) throw new Error(formatApiError(await response.text()));
    return response.json();
  }, [user]);

  const load = useCallback(async (authUser = user) => {
    try { const data = await adminFetch("/api/admin/look-collections", undefined, authUser) as ApiList; setItems(data.items); setMessage(""); }
    catch { setMessage("Access denied or Firebase admin env is missing."); }
  }, [adminFetch, user]);

  useEffect(() => {
    if (missingClientEnv.length) return;
    let unsubscribe: (() => void) | undefined;
    Promise.all([import("@/lib/firebase/client"), import("firebase/auth")]).then(([client, authModule]) => {
      unsubscribe = authModule.onAuthStateChanged(client.auth, (nextUser) => { setUser(nextUser); if (nextUser) void load(nextUser); });
    }).catch(() => setMessage("Firebase client env is missing."));
    return () => unsubscribe?.();
  }, [load]);

  function patchDraft(patch: Partial<CollectionDraft>) { setDraft((current) => ({ ...current, ...patch })); setErrors({}); }
  function showToast(nextMessage: string) { setMessage(nextMessage); window.setTimeout(() => setMessage((current) => current === nextMessage ? "" : current), 3500); }

  async function upload(file: File) {
    setUploading(true);
    try {
      const body = new FormData(); body.append("file", file); body.append("kind", "lookCollection");
      const data = await adminFetch("/api/admin/uploads/image", { method: "POST", body }) as { secureUrl?: string; publicId?: string };
      if (!data.secureUrl) throw new Error("Upload failed.");
      patchDraft({ cardImageUrl: data.secureUrl, cardImagePublicId: data.publicId ?? "" });
    } catch (error) { setErrors({ cardImageUrl: error instanceof Error ? error.message : "Upload failed." }); }
    finally { setUploading(false); }
  }

  async function save() {
    const validation = validateDraft(draft, items, editingId);
    setErrors(validation.errors);
    if (!validation.ok) return;
    const body = JSON.stringify({ slug: slugPreview, name: draft.name, subtitle: draft.subtitle, description: draft.description, status: draft.status, sortOrder: validation.sortOrder, cardImage: { url: draft.cardImageUrl, alt: draft.name, publicId: draft.cardImagePublicId || undefined } });
    try { await adminFetch(editingId ? `/api/admin/look-collections/${editingId}` : "/api/admin/look-collections", { method: editingId ? "PUT" : "POST", body }); setDraft(emptyDraft); setEditingId(null); await load(); showToast("Collection saved."); }
    catch (error) { setErrors({ summary: error instanceof Error ? error.message : "Save failed." }); }
  }

  async function archive(id: string) { try { await adminFetch(`/api/admin/look-collections/${id}`, { method: "DELETE" }); await load(); showToast("Collection archived."); } catch { setErrors({ summary: "Archive failed." }); } }
  function edit(item: LookCollection) { setEditingId(item.id); setDraft({ name: item.name, subtitle: item.subtitle, description: item.description, status: item.status === "active" ? "active" : "draft", sortOrder: String(item.sortOrder), cardImageUrl: item.cardImage.url, cardImagePublicId: item.cardImage.publicId ?? "" }); setErrors({}); window.scrollTo({ top: 0, behavior: "smooth" }); }

  return <AdminShell title="Look Collections" description="Create and manage the four Shop The Look collection slots.">
    <div className="adminLookWorkspace">
      <section className="adminCard adminLookEditor"><div className="adminCard__heading"><p>LOOK COLLECTIONS</p><h2>{editingId ? "Edit collection" : "Create collection"}</h2><span>{message}</span></div>{errors.summary ? <p className="adminFormAlert">{errors.summary}</p> : null}
        <AdminLookSection number="01" title="Collection details"><div className="adminProductGrid adminProductGrid--two"><AdminLookField label="Collection name" error={errors.name}><input placeholder="SUMMER ROAD" value={draft.name} onChange={(event) => patchDraft({ name: event.target.value })} /></AdminLookField><AdminLookField label="Slug preview"><input value={slugPreview || "collection-name"} readOnly /></AdminLookField></div><AdminLookField label="Subtitle"><input placeholder="Light. Fast. Unstoppable." value={draft.subtitle} onChange={(event) => patchDraft({ subtitle: event.target.value })} /></AdminLookField><AdminLookField label="Description"><textarea rows={3} placeholder="Describe this collection." value={draft.description} onChange={(event) => patchDraft({ description: event.target.value })} /></AdminLookField></AdminLookSection>
        <AdminLookSection number="02" title="Card position"><AdminLookField label="Fixed homepage slot" helper="The chosen slot sets sortOrder 1–4." error={errors.sortOrder}><select value={draft.sortOrder} onChange={(event) => patchDraft({ sortOrder: event.target.value })}>{COLLECTION_SLOTS.map((slot) => <option key={slot.order} value={slot.order}>{slot.label}</option>)}</select></AdminLookField></AdminLookSection>
        <AdminLookSection number="03" title="Visibility"><div className="adminPillGroup">{(["draft", "active"] as const).map((status) => <button className={draft.status === status ? "isSelected" : undefined} key={status} type="button" onClick={() => patchDraft({ status })}>{status}</button>)}</div></AdminLookSection>
        <AdminLookSection number="04" title="Card image"><label className="adminUploadButton"><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} /><span>{uploading ? "Uploading…" : draft.cardImageUrl ? "Replace card image" : "Upload card image"}</span></label>{errors.cardImageUrl ? <small className="adminInlineError">{errors.cardImageUrl}</small> : null}{draft.cardImageUrl ? <figure className="adminLookPreview adminLookPreview--landscape"><Image src={draft.cardImageUrl} alt="Collection card preview" width={220} height={130} unoptimized /><button type="button" onClick={() => patchDraft({ cardImageUrl: "", cardImagePublicId: "" })}>Remove image</button></figure> : null}</AdminLookSection>
        <div className="adminProductActions"><button className="adminPrimary" type="button" onClick={save}>Save collection</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft); }}>Cancel edit</button> : null}</div>
      </section>
      <section className="adminCard"><div className="adminCard__heading"><p>COLLECTION LIST</p><h2>Collections</h2></div><div className="adminLookList">{items.map((item) => <article className="adminLookRow" key={item.id}>{item.cardImage.url ? <Image src={item.cardImage.url} alt={item.cardImage.alt} width={96} height={58} unoptimized /> : null}<div><strong>{String(item.sortOrder).padStart(2, "0")} · {item.name}</strong><span>{item.slug} · {item.status}</span></div><button type="button" onClick={() => edit(item)}>Edit</button>{item.status === "archived" ? <span>Archived</span> : <button type="button" onClick={() => archive(item.id)}>Archive</button>}</article>)}</div></section>
    </div>
  </AdminShell>;
}

function validateDraft(draft: CollectionDraft, items: LookCollection[], editingId: string | null): { ok: boolean; errors: FieldErrors; sortOrder: number } {
  const errors: FieldErrors = {};
  const sortOrder = Number(draft.sortOrder);
  if (!draft.name.trim()) errors.name = "Enter a collection name.";
  if (!Number.isFinite(sortOrder) || sortOrder < 1 || sortOrder > 4) errors.sortOrder = "Choose one of the four homepage slots.";
  if (draft.status === "active" && !draft.cardImageUrl) errors.cardImageUrl = "Upload a card image before activating this collection.";
  const conflict = items.find((item) => item.id !== editingId && item.status === "active" && item.sortOrder === sortOrder && draft.status === "active");
  if (conflict) errors.sortOrder = `Slot ${sortOrder} is already used by ${conflict.name}.`;
  return { ok: Object.keys(errors).length === 0, errors, sortOrder: Number.isFinite(sortOrder) ? sortOrder : 1 };
}

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }
function formatApiError(raw: string) { try { const parsed = JSON.parse(raw) as { error?: string; issues?: { fieldErrors?: Record<string, string[]> } }; const firstField = parsed.issues?.fieldErrors ? Object.values(parsed.issues.fieldErrors)[0]?.[0] : null; return firstField ?? parsed.error ?? "Save failed."; } catch { return raw || "Save failed."; } }
function AdminLookSection({ number, title, children }: { number: string; title: string; children: ReactNode }) { return <section className="adminLookSection"><header><span>{number}</span><h3>{title}</h3></header>{children}</section>; }
function AdminLookField({ label, helper, error, children }: { label: string; helper?: string; error?: string; children: ReactNode }) { return <label className="adminLookField"><span>{label}</span>{children}{helper ? <small>{helper}</small> : null}{error ? <small className="adminInlineError">{error}</small> : null}</label>; }
