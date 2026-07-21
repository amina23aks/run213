"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminShell } from "@/components/admin/AdminShell";

type Status = "pending" | "approved" | "rejected";
type Submission = { id: string; name: string; contactType: string; contactValue: string; instagram: string | null; wilaya: string | null; caption: string | null; publicName: string; publicCaption: string | null; publicWilaya: string | null; monthKey: string; status: Status; consentAccepted: boolean; proofImage: { secureUrl: string; width: number; height: number; format?: string; bytes?: number; publicId?: string } | null; createdAt: string | null; rejectionReason: string | null };
type Summary = { pendingCount: number; approvedCount: number; rejectedCount: number; monthlyApprovedCount: number; maximumApproved: number; remaining: number; status: "open" | "full" };

const statusLabels: Record<Status, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected" };

function formatSubmitted(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
}

function formatBytes(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: Status | Summary["status"] }) {
  return <span className={`adminRunClubBadge adminRunClubBadge--${status}`}>{status.toUpperCase()}</span>;
}

export function AdminRunClubClient({ defaultMonth }: { defaultMonth: string }) {
  const [month, setMonth] = useState(defaultMonth);
  const [status, setStatus] = useState<Status>("pending");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<Submission[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const token = useCallback(async () => { const [{ auth }] = await Promise.all([import("@/lib/firebase/client"), import("firebase/auth")]); const user = auth.currentUser; if (!user) throw new Error("Admin sign-in required."); return user.getIdToken(); }, []);
  const load = useCallback(async (append = false) => { setLoading(true); setMessage(""); try { const authToken = await token(); const q = new URLSearchParams({ month, status, limit: "20" }); if (append && cursor) q.set("cursor", cursor); const [summaryResponse, listResponse] = await Promise.all([fetch(`/api/admin/run-club/summary?month=${month}`, { headers: { Authorization: `Bearer ${authToken}` } }), fetch(`/api/admin/run-club/submissions?${q}`, { headers: { Authorization: `Bearer ${authToken}` } })]); const summaryPayload = await summaryResponse.json(); const listPayload = await listResponse.json(); if (!summaryResponse.ok || !listResponse.ok) throw new Error(summaryPayload.message || listPayload.message || "Run Club data failed to load."); setSummary(summaryPayload); const loadedSubmissions = listPayload.submissions as Submission[]; setItems((current) => append ? [...current, ...loadedSubmissions] : loadedSubmissions); setCursor(listPayload.nextCursor); if (!append) setSelected((current) => current && loadedSubmissions.some((item) => item.id === current.id) ? current : loadedSubmissions[0] ?? null); } catch (error) { setMessage(error instanceof Error ? error.message : "Run Club data failed to load."); } finally { setLoading(false); } }, [cursor, month, status, token]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(false); }, 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { if (!previewOpen) return undefined; const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setPreviewOpen(false); }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [previewOpen]);
  async function moderate(action: "approve" | "reject") { if (!selected) return; if (action === "reject" && selected.status !== "rejected" && !isRejecting) { setIsRejecting(true); return; } if (action === "reject" && selected.status === "approved" && !window.confirm("Reject this already approved entry? It will be removed from the public feed by the existing moderation API.")) return; setLoading(true); try { const authToken = await token(); const payload = action === "approve" ? { action, publicName: selected.publicName || selected.name, publicCaption: selected.publicCaption, publicWilaya: selected.publicWilaya } : { action, rejectionReason: selected.rejectionReason || null }; const response = await fetch(`/api/admin/run-club/submissions/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }, body: JSON.stringify(payload) }); const result = await response.json(); if (!response.ok) throw new Error(result.message || "Moderation failed."); setMessage(action === "approve" ? "Submission approved." : "Submission rejected."); setIsRejecting(false); setSelected(null); await load(false); } catch (error) { setMessage(error instanceof Error ? error.message : "Moderation failed."); } finally { setLoading(false); } }
  const summaryCards = useMemo(() => summary ? [
    ["Pending", summary.pendingCount, "pending"], ["Approved", summary.approvedCount, "approved"], ["Rejected", summary.rejectedCount, "rejected"], ["Approved this month", `${summary.monthlyApprovedCount} / ${summary.maximumApproved}`, "approved"], ["Remaining", summary.remaining, "neutral"], ["Status", summary.status.toUpperCase(), summary.status],
  ] as const : [], [summary]);
  return (
    <AdminShell title="Run Club" description="Review monthly run proof submissions.">
      <AdminAccessGate>
        <section className="adminCard adminRunClub">
          <div className="adminCard__heading"><p>RUN CLUB MODERATION</p><h2>Submission queue</h2><span>Approve only safe public fields. Private identity data stays Admin-only.</span></div>
          {summary && <div className="adminRunClubStats" aria-label="Run Club moderation summary">{summaryCards.map(([label, value, tone]) => <article className={`adminRunClubStat adminRunClubStat--${tone}`} key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>}
          <div className="adminRunClubControls"><label htmlFor="run-club-month">Month<input id="run-club-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label><label htmlFor="run-club-status">Status<select id="run-club-status" value={status} onChange={(e) => setStatus(e.target.value as Status)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label><button className="adminSecondary" disabled={loading} onClick={() => void load(false)} type="button">{loading ? "Refreshing..." : "Refresh"}</button></div>
          {message && <p className="adminNotice" role="status">{message}</p>}
          <div className="adminRunClubWorkspace">
            <div className="adminRunClubList" aria-label="Run Club submissions">{items.length ? items.map((item) => <button className={`adminRunClubItem ${selected?.id === item.id ? "isSelected" : ""}`} key={item.id} type="button" onClick={() => { setSelected(item); setIsRejecting(false); }}>{item.proofImage && <Image src={item.proofImage.secureUrl} alt={`Run proof thumbnail for ${item.name}`} width={80} height={80} />}<span><strong>{item.name}</strong><small>{item.contactType}: {item.contactValue}</small><small>{item.instagram ? `Instagram: ${item.instagram}` : "Instagram: —"}</small><small>Submitted: {formatSubmitted(item.createdAt)}</small></span><StatusBadge status={item.status} /></button>) : <p className="adminRunClubEmpty">No submissions found for this month and status.</p>}</div>
            {selected && <aside className="adminRunClubDetail" aria-labelledby="submission-detail-title"><div className="adminRunClubDetail__media">{selected.proofImage ? <button type="button" onClick={() => setPreviewOpen(true)} aria-label="Open larger proof preview"><Image className="adminRunClubDetail__image" src={selected.proofImage.secureUrl} alt={`Full run proof submitted by ${selected.name}`} width={720} height={720} /></button> : <p>No proof image.</p>}</div><div className="adminRunClubDetail__content"><div className="adminCard__heading"><p>SUBMISSION DETAIL</p><h2 id="submission-detail-title">{selected.name}</h2><span>{statusLabels[selected.status]} · {selected.monthKey}</span></div><section className="adminRunClubInfo"><h3>Private submission information</h3><dl><dt>Name</dt><dd>{selected.name}</dd><dt>Contact</dt><dd>{selected.contactType}: {selected.contactValue}</dd><dt>Instagram</dt><dd>{selected.instagram || "—"}</dd><dt>Wilaya</dt><dd>{selected.wilaya || "—"}</dd><dt>Caption</dt><dd>{selected.caption || "—"}</dd><dt>Consent</dt><dd>{selected.consentAccepted ? "Accepted" : "Missing"}</dd><dt>Submitted</dt><dd>{formatSubmitted(selected.createdAt)}</dd><dt>Image metadata</dt><dd>{selected.proofImage ? `${selected.proofImage.width}×${selected.proofImage.height} · ${selected.proofImage.format ?? "image"} · ${formatBytes(selected.proofImage.bytes)}` : "—"}</dd><dt>Current status</dt><dd><StatusBadge status={selected.status} /></dd></dl></section><section className="adminRunClubPublicFields"><h3>Public information</h3><p>Only these fields become public after approval. Contact and Instagram stay private.</p><label htmlFor="public-name">Public name<input id="public-name" value={selected.publicName} onChange={(e) => setSelected({ ...selected, publicName: e.target.value })} /></label><label htmlFor="public-caption">Public caption<textarea id="public-caption" value={selected.publicCaption ?? ""} onChange={(e) => setSelected({ ...selected, publicCaption: e.target.value || null })} /></label><label htmlFor="public-wilaya">Public Wilaya<input id="public-wilaya" value={selected.publicWilaya ?? ""} onChange={(e) => setSelected({ ...selected, publicWilaya: e.target.value || null })} /></label></section>{(isRejecting || selected.status === "rejected") ? <label className="adminRunClubRejectReason" htmlFor="rejection-reason">Rejection reason<textarea id="rejection-reason" value={selected.rejectionReason ?? ""} onChange={(e) => setSelected({ ...selected, rejectionReason: e.target.value || null })} placeholder="Add the reason shown in Admin records." /></label> : null}<div className="adminRunClubActions"><button className="adminPrimary" disabled={loading} onClick={() => void moderate("approve")} type="button">{loading ? "Working..." : "APPROVE"}</button><button className="adminDanger" disabled={loading} onClick={() => void moderate("reject")} type="button">{loading ? "Working..." : isRejecting || selected.status === "rejected" ? "CONFIRM REJECT" : "REJECT"}</button><button className="adminSecondary" disabled={loading} onClick={() => setSelected(null)} type="button">CLOSE</button></div></div></aside>}
          </div>
          {cursor && <button className="adminSecondary" disabled={loading} onClick={() => void load(true)} type="button">Load more</button>}
        </section>
        {previewOpen && selected?.proofImage ? <div className="adminRunClubPreview" role="dialog" aria-modal="true" aria-label="Run proof larger preview" onClick={() => setPreviewOpen(false)}><button type="button" onClick={() => setPreviewOpen(false)}>Close preview</button><Image src={selected.proofImage.secureUrl} alt={`Large proof preview for ${selected.name}`} width={1200} height={1200} /></div> : null}
      </AdminAccessGate>
    </AdminShell>
  );
}
