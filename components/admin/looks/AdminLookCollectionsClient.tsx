"use client";

import Image from "next/image";
import type { User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getMissingFirebaseClientEnv } from "@/lib/env";
import type { LookCollection } from "@/types/look";

type ApiList = { items: LookCollection[] };
const missingClientEnv = getMissingFirebaseClientEnv();
const emptyDraft = { name: "", subtitle: "", description: "", status: "draft", sortOrder: "10", cardImageUrl: "", cardImagePublicId: "" };

export function AdminLookCollectionsClient() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<LookCollection[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("Sign in with an approved admin email.");
  const [uploading, setUploading] = useState(false);

  const adminFetch = useCallback(async (path: string, init?: RequestInit, authUser = user) => {
    const token = await authUser?.getIdToken();
    const response = await fetch(path, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...init?.headers } });
    if (!response.ok) throw new Error(await response.text());
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

  async function upload(file: File) {
    setUploading(true);
    try {
      const body = new FormData(); body.append("file", file); body.append("kind", "lookCollection");
      const data = await adminFetch("/api/admin/uploads/image", { method: "POST", body }) as { secureUrl?: string; publicId?: string };
      if (!data.secureUrl) throw new Error("Upload failed.");
      setDraft((current) => ({ ...current, cardImageUrl: data.secureUrl ?? "", cardImagePublicId: data.publicId ?? "" }));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed."); }
    finally { setUploading(false); }
  }

  async function save() {
    const body = JSON.stringify({ slug: slugify(draft.name), name: draft.name, subtitle: draft.subtitle, description: draft.description, status: draft.status, sortOrder: draft.sortOrder, cardImage: { url: draft.cardImageUrl, alt: draft.name, publicId: draft.cardImagePublicId || undefined } });
    try { await adminFetch(editingId ? `/api/admin/look-collections/${editingId}` : "/api/admin/look-collections", { method: editingId ? "PUT" : "POST", body }); setDraft(emptyDraft); setEditingId(null); await load(); setMessage("Collection saved."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Save failed."); }
  }

  async function archive(id: string) { try { await adminFetch(`/api/admin/look-collections/${id}`, { method: "DELETE" }); await load(); setMessage("Collection archived."); } catch { setMessage("Archive failed."); } }

  function edit(item: LookCollection) { setEditingId(item.id); setDraft({ name: item.name, subtitle: item.subtitle, description: item.description, status: item.status === "active" ? "active" : "draft", sortOrder: String(item.sortOrder), cardImageUrl: item.cardImage.url, cardImagePublicId: item.cardImage.publicId ?? "" }); }

  return <AdminShell title="Look Collections" description="Create and manage Shop The Look collection cards.">
    <section className="adminCard adminLookEditor"><div className="adminCard__heading"><p>LOOK COLLECTIONS</p><h2>{editingId ? "Edit collection" : "Create collection"}</h2><span>{message}</span></div>
      <div className="adminProductGrid adminProductGrid--two"><input placeholder="CITY EVERYDAY" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /><input placeholder="Movement in every moment." value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} /></div>
      <textarea rows={3} placeholder="Description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
      <div className="adminProductGrid adminProductGrid--three"><input inputMode="numeric" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} /><div className="adminPillGroup">{(["draft", "active"] as const).map((status) => <button className={draft.status === status ? "isSelected" : undefined} key={status} type="button" onClick={() => setDraft({ ...draft, status })}>{status}</button>)}</div><label className="adminUploadButton"><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} /><span>{uploading ? "Uploading…" : "Upload card image"}</span></label></div>
      {draft.cardImageUrl ? <Image className="adminLookThumb" src={draft.cardImageUrl} alt="Collection card" width={120} height={90} unoptimized /> : null}
      <div className="adminProductActions"><button className="adminPrimary" type="button" onClick={save}>Save collection</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft); }}>Cancel</button> : null}</div>
    </section>
    <section className="adminCard"><div className="adminCard__heading"><p>COLLECTION LIST</p><h2>Collections</h2></div><div className="adminLookList">{items.map((item) => <article className="adminLookRow" key={item.id}>{item.cardImage.url ? <Image src={item.cardImage.url} alt={item.cardImage.alt} width={72} height={72} unoptimized /> : null}<div><strong>{item.name}</strong><span>{item.status} · {item.slug}</span></div><button type="button" onClick={() => edit(item)}>Edit</button>{item.status === "archived" ? <span>Archived</span> : <button type="button" onClick={() => archive(item.id)}>Archive</button>}</article>)}</div></section>
  </AdminShell>;
}

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }
