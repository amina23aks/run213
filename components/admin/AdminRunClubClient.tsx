"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminShell } from "@/components/admin/AdminShell";

type Status = "pending" | "approved" | "rejected";
type Submission = { id: string; name: string; contactType: string; contactValue: string; instagram: string | null; wilaya: string | null; caption: string | null; publicName: string; publicCaption: string | null; publicWilaya: string | null; monthKey: string; status: Status; consentAccepted: boolean; proofImage: { secureUrl: string; width: number; height: number; format?: string; bytes?: number; publicId?: string } | null; createdAt: string | null; rejectionReason: string | null };
type Summary = { pendingCount: number; approvedCount: number; rejectedCount: number; monthlyApprovedCount: number; maximumApproved: number; remaining: number; status: "open" | "full" };

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
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const token = useCallback(async () => {
    const [{ auth }] = await Promise.all([import("@/lib/firebase/client"), import("firebase/auth")]);
    const user = auth.currentUser;
    if (!user) throw new Error("Admin sign-in required.");
    return user.getIdToken();
  }, []);

  const load = useCallback(async (append = false) => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = await token();
      const q = new URLSearchParams({ month, status, limit: "20" });
      if (append && cursor) q.set("cursor", cursor);
      const [summaryResponse, listResponse] = await Promise.all([
        fetch(`/api/admin/run-club/summary?month=${month}`, { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch(`/api/admin/run-club/submissions?${q}`, { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);
      const summaryPayload = await summaryResponse.json();
      const listPayload = await listResponse.json();
      if (!summaryResponse.ok || !listResponse.ok) throw new Error(summaryPayload.message || listPayload.message || "Run Club data failed to load.");
      const loadedSubmissions = listPayload.submissions as Submission[];
      setSummary(summaryPayload);
      setItems((current) => append ? [...current, ...loadedSubmissions] : loadedSubmissions);
      setCursor(listPayload.nextCursor);
      if (!append) {
        setSelected(null);
        setIsRejecting(false);
        setRejectionReason("");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Run Club data failed to load.");
    } finally {
      setLoading(false);
    }
  }, [cursor, month, status, token]);

  useEffect(() => { const timer = window.setTimeout(() => { void load(false); }, 0); return () => window.clearTimeout(timer); }, [load]);

  async function moderate(action: "approve" | "reject") {
    if (!selected) return;
    if (action === "reject" && !isRejecting && selected.status !== "rejected") { setIsRejecting(true); return; }
    if (action === "reject" && selected.status === "approved" && !window.confirm("Reject this already approved entry? Existing moderation rules will handle the public feed update.")) return;
    setLoading(true);
    try {
      const authToken = await token();
      const payload = action === "approve"
        ? { action, publicName: selected.publicName || selected.name, publicCaption: selected.publicCaption, publicWilaya: selected.publicWilaya }
        : { action, rejectionReason: rejectionReason || selected.rejectionReason || null };
      const response = await fetch(`/api/admin/run-club/submissions/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Moderation failed.");
      setMessage(action === "approve" ? "Submission approved." : "Submission rejected.");
      setSelected(null);
      setIsRejecting(false);
      setRejectionReason("");
      await load(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Moderation failed.");
    } finally {
      setLoading(false);
    }
  }

  const summaryCards = useMemo(() => summary ? [
    ["Pending", summary.pendingCount, "pending"],
    ["Approved", summary.approvedCount, "approved"],
    ["Rejected", summary.rejectedCount, "rejected"],
    ["Approved this month", `${summary.monthlyApprovedCount} / ${summary.maximumApproved}`, "approved"],
    ["Remaining", summary.remaining, "neutral"],
    ["Status", summary.status.toUpperCase(), summary.status],
  ] as const : [], [summary]);

  return (
    <AdminShell title="Run Club" description="Review monthly run proof submissions.">
      <AdminAccessGate>
        <section className="adminCard adminRunClub">
          <div className="adminCard__heading"><p>RUN CLUB MODERATION</p><h2>Submission queue</h2><span>Compact review table. Select a submission to moderate it.</span></div>
          {summary ? <div className="adminRunClubStats" aria-label="Run Club moderation summary">{summaryCards.map(([label, value, tone]) => <article className={`adminRunClubStat adminRunClubStat--${tone}`} key={label}><span>{label}</span><strong>{value}</strong></article>)}</div> : null}
          <div className="adminRunClubControls"><label htmlFor="run-club-month">Month<input id="run-club-month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label><label htmlFor="run-club-status">Status<select id="run-club-status" value={status} onChange={(event) => setStatus(event.target.value as Status)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label><button className="adminSecondary" disabled={loading} onClick={() => void load(false)} type="button">{loading ? "Refreshing..." : "Refresh"}</button></div>
          {message ? <p className="adminNotice" role="status">{message}</p> : null}
          <div className="adminRunClubTable" role="table" aria-label="Run Club submissions"><div className="adminRunClubTable__head" role="row"><span>Proof</span><span>Participant</span><span>Contact</span><span>Instagram</span><span>Submitted</span><span>Status</span><span>Action</span></div>{items.length ? items.map((item) => <button className="adminRunClubRow" key={item.id} type="button" onClick={() => { setSelected(item); setIsRejecting(false); setRejectionReason(item.rejectionReason ?? ""); }}><span>{item.proofImage ? <Image src={item.proofImage.secureUrl} alt={`Run proof thumbnail for ${item.name}`} width={64} height={64} /> : null}</span><strong>{item.name}</strong><span>{item.contactType}: {item.contactValue}</span><span>{item.instagram || "—"}</span><span>{formatSubmitted(item.createdAt)}</span><StatusBadge status={item.status} /><span className="adminRunClubRow__action">Review</span></button>) : <p className="adminRunClubEmpty">No submissions found for this month and status.</p>}</div>
          {cursor ? <button className="adminSecondary" disabled={loading} onClick={() => void load(true)} type="button">Load more</button> : null}
        </section>

        {selected ? <aside className="adminCard adminRunClubDetail" aria-labelledby="submission-detail-title"><div className="adminRunClubDetail__media">{selected.proofImage ? <Image className="adminRunClubDetail__image" src={selected.proofImage.secureUrl} alt={`Full run proof submitted by ${selected.name}`} width={720} height={720} /> : <p>No proof image.</p>}</div><div className="adminRunClubDetail__content"><div className="adminCard__heading"><p>SUBMISSION DETAIL</p><h2 id="submission-detail-title">{selected.name}</h2><span>{selected.status.toUpperCase()} · {selected.monthKey}</span></div><section className="adminRunClubInfo"><h3>Submission information</h3><dl><dt>Name</dt><dd>{selected.name}</dd><dt>Contact</dt><dd>{selected.contactType}: {selected.contactValue}</dd><dt>Instagram</dt><dd>{selected.instagram || "—"}</dd><dt>Wilaya</dt><dd>{selected.wilaya || "—"}</dd><dt>Caption</dt><dd>{selected.caption || "—"}</dd><dt>Consent</dt><dd>{selected.consentAccepted ? "Accepted" : "Missing"}</dd><dt>Submitted</dt><dd>{formatSubmitted(selected.createdAt)}</dd><dt>Image</dt><dd>{selected.proofImage ? `${selected.proofImage.width}×${selected.proofImage.height} · ${selected.proofImage.format ?? "image"} · ${formatBytes(selected.proofImage.bytes)}` : "—"}</dd><dt>Status</dt><dd><StatusBadge status={selected.status} /></dd></dl></section>{(isRejecting || selected.status === "rejected") ? <label className="adminRunClubRejectReason" htmlFor="rejection-reason">Rejection reason<textarea id="rejection-reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Add the reason before confirming rejection." /></label> : null}<div className="adminRunClubActions"><button className="adminPrimary" disabled={loading} onClick={() => void moderate("approve")} type="button">{loading ? "Working..." : "APPROVE"}</button><button className="adminDanger" disabled={loading} onClick={() => void moderate("reject")} type="button">{loading ? "Working..." : isRejecting || selected.status === "rejected" ? "CONFIRM REJECT" : "REJECT"}</button><button className="adminSecondary" disabled={loading} onClick={() => { setSelected(null); setIsRejecting(false); setRejectionReason(""); }} type="button">CLOSE</button></div></div></aside> : null}
      </AdminAccessGate>
    </AdminShell>
  );
}
