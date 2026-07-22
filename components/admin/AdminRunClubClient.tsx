"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminShell } from "@/components/admin/AdminShell";

type Status = "pending" | "approved" | "rejected";
type Submission = { id: string; name: string; contactType: string; contactValue: string; instagram: string | null; wilaya: string | null; caption: string | null; publicName: string; publicCaption: string | null; publicWilaya: string | null; monthKey: string; status: Status; consentAccepted: boolean; proofImage: { secureUrl: string; width: number; height: number; format?: string; bytes?: number; publicId?: string } | null; createdAt: string | null; rejectionReason: string | null };
type PublicWinner = { submissionId: string; publicName: string; publicCaption: string | null; publicWilaya: string | null; proofImage: { secureUrl: string; width: number; height: number }; monthKey: string; winnerSelectedAt: string; placement?: number };
type Summary = { pendingCount: number; approvedCount: number; rejectedCount: number; monthlyApprovedCount: number; maximumApproved: number; remaining: number; status: "open" | "full"; eligibleDrawCount: number; drawStatus: "not_drawn" | "drawn"; winner: PublicWinner | null; winners?: PublicWinner[]; winnerCount?: number; eligibleCountAtDraw: number | null; winnerSelectedAt: string | null; approvedCountMismatch: boolean };

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
  return (
    <AdminShell title="Run Club" description="Review monthly run proof submissions.">
      <AdminAccessGate>
        <AdminRunClubWorkspace defaultMonth={defaultMonth} />
      </AdminAccessGate>
    </AdminShell>
  );
}

function AdminRunClubWorkspace({ defaultMonth }: { defaultMonth: string }) {
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
  const [confirmDrawOpen, setConfirmDrawOpen] = useState(false);
  const [winnerCount, setWinnerCount] = useState(1);
  const lastSelectedRowRef = useRef<HTMLDivElement | null>(null);

  const token = useCallback(async (forceRefresh = false) => {
    const [{ auth }] = await Promise.all([import("@/lib/firebase/client"), import("firebase/auth")]);
    const user = auth.currentUser;
    if (!user) throw new Error("Admin sign-in required.");
    return user.getIdToken(forceRefresh);
  }, []);

  const adminFetch = useCallback(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const makeRequest = async (forceRefresh: boolean) => {
      const authToken = await token(forceRefresh);
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${authToken}`);
      return fetch(input, { ...init, headers });
    };
    const response = await makeRequest(false);
    return response.status === 401 ? makeRequest(true) : response;
  }, [token]);

  const load = useCallback(async (append = false) => {
    setLoading(true);
    setMessage("");
    try {
      const q = new URLSearchParams({ month, status, limit: "20" });
      if (append && cursor) q.set("cursor", cursor);
      const [summaryResponse, listResponse] = await Promise.all([
        adminFetch(`/api/admin/run-club/summary?month=${month}`),
        adminFetch(`/api/admin/run-club/submissions?${q}`),
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
  }, [adminFetch, cursor, month, status]);

  useEffect(() => { const timer = window.setTimeout(() => { void load(false); }, 0); return () => window.clearTimeout(timer); }, [load]);

  const closeModal = useCallback(() => {
    setSelected(null);
    setIsRejecting(false);
    setRejectionReason("");
    window.requestAnimationFrame(() => lastSelectedRowRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!selected) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !loading) closeModal(); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeModal, loading, selected]);

  async function moderate(action: "approve" | "reject") {
    if (!selected) return;
    if (action === "reject" && !isRejecting && selected.status !== "rejected") { setIsRejecting(true); return; }
    if (action === "reject" && selected.status === "approved" && !window.confirm("Reject this already approved entry? Existing moderation rules will handle the public feed update.")) return;
    setLoading(true);
    try {
      const payload = action === "approve"
        ? { action, publicName: selected.publicName || selected.name, publicCaption: selected.publicCaption, publicWilaya: selected.publicWilaya }
        : { action, rejectionReason: rejectionReason || selected.rejectionReason || null };
      const response = await adminFetch(`/api/admin/run-club/submissions/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Moderation failed.");
      setMessage(action === "approve" ? "Submission approved." : "Submission rejected.");
      closeModal();
      await load(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Moderation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function drawWinner() {
    setLoading(true);
    setMessage("");
    try {
      const response = await adminFetch(`/api/admin/run-club/months/${month}/draw`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ winnerCount }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Draw failed.");
      setMessage(result.message || "Winner saved.");
      setConfirmDrawOpen(false);
      await load(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Draw failed.");
    } finally {
      setLoading(false);
    }
  }

  function openModal(item: Submission, row: HTMLDivElement) {
    lastSelectedRowRef.current = row;
    setSelected(item);
    setIsRejecting(false);
    setRejectionReason(item.rejectionReason ?? "");
  }

  const winnerList = summary?.winners?.length ? summary.winners : summary?.winner ? [summary.winner] : [];

  const summaryCards = useMemo(() => summary ? [
    ["Pending", summary.pendingCount, "pending"],
    ["Approved", summary.approvedCount, "approved"],
    ["Rejected", summary.rejectedCount, "rejected"],
    ["Approved this month", `${summary.monthlyApprovedCount} / ${summary.maximumApproved}`, "approved"],
    ["Remaining", summary.remaining, "neutral"],
    ["Status", summary.status.toUpperCase(), summary.status],
  ] as const : [], [summary]);

  return (
    <>
      <section className="adminCard adminRunClub">
          <div className="adminCard__heading"><p>RUN CLUB MODERATION</p><h2>Submission queue</h2><span>Compact review table. Select a submission to moderate it.</span></div>
          {summary ? <div className="adminRunClubStats" aria-label="Run Club moderation summary">{summaryCards.map(([label, value, tone]) => <article className={`adminRunClubStat adminRunClubStat--${tone}`} key={label}><span>{label}</span><strong>{value}</strong></article>)}</div> : null}
          <div className="adminRunClubControls"><label htmlFor="run-club-month">Month<input id="run-club-month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label><label htmlFor="run-club-status">Status<select id="run-club-status" value={status} onChange={(event) => setStatus(event.target.value as Status)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label><button className="adminSecondary" disabled={loading} onClick={() => void load(false)} type="button">{loading ? "Refreshing..." : "Refresh"}</button></div>
          {message ? <p className="adminNotice" role="status">{message}</p> : null}
          {summary ? <section className="adminRunClubDraw" aria-labelledby="run-club-draw-title"><div><p className="adminRunClubDraw__badge">{summary.drawStatus === "drawn" ? "MONTHLY WINNER" : "MONTHLY DRAW"}</p><h3 id="run-club-draw-title">{winnerList.length ? `${winnerList.length} winner${winnerList.length > 1 ? "s" : ""} saved` : `${summary.eligibleDrawCount} eligible approved participants`}</h3><span>{winnerList.length ? `Selected from ${summary.eligibleCountAtDraw ?? summary.eligibleDrawCount} approved participants` : "Winner not selected"}</span>{summary.approvedCountMismatch ? <strong className="adminRunClubDraw__warning">Counter mismatch: using {summary.eligibleDrawCount} actual eligible entries for draw.</strong> : null}</div>{winnerList.length ? <div className="adminRunClubWinners">{winnerList.map((winner) => <article className="adminRunClubWinner" key={winner.submissionId}><Image src={winner.proofImage.secureUrl} alt={`Winner proof from ${winner.publicName}`} width={72} height={72} /><div><strong>{winner.placement ? `WINNER ${winner.placement}` : "WINNER SAVED"}</strong><span>{winner.publicName}</span><small>{winner.monthKey} · Draw completed on {formatSubmitted(winner.winnerSelectedAt)}</small></div></article>)}</div> : <button className="adminPrimary" type="button" disabled={loading || summary.eligibleDrawCount === 0} onClick={() => setConfirmDrawOpen(true)}>DRAW WINNER</button>}</section> : null}
          <div className="adminRunClubTable" role="table" aria-label="Run Club submissions"><div className="adminRunClubTable__head" role="row"><span>Proof</span><span>Participant</span><span>Contact</span><span>Instagram</span><span>Submitted</span><span>Status</span></div>{items.length ? items.map((item) => <div className="adminRunClubRow" key={item.id} role="row" tabIndex={0} onClick={(event) => { if ((event.target as HTMLElement).closest("button,a,input,select,textarea")) return; openModal(item, event.currentTarget); }} onKeyDown={(event) => { if (event.key !== "Enter" && event.key !== " ") return; event.preventDefault(); openModal(item, event.currentTarget); }}><span>{item.proofImage ? <Image src={item.proofImage.secureUrl} alt={`Run proof thumbnail for ${item.name}`} width={64} height={64} /> : null}</span><strong>{item.name}</strong><span>{item.contactType}: {item.contactValue}</span><span>{item.instagram || "—"}</span><span>{formatSubmitted(item.createdAt)}</span><StatusBadge status={item.status} /></div>) : <p className="adminRunClubEmpty">No submissions found for this month and status.</p>}</div>
          {cursor ? <button className="adminSecondary" disabled={loading} onClick={() => void load(true)} type="button">Load more</button> : null}
      </section>

      {confirmDrawOpen ? <div className="adminRunClubModalOverlay" role="presentation"><aside className="adminRunClubConfirm" role="dialog" aria-modal="true" aria-labelledby="draw-confirm-title"><h2 id="draw-confirm-title">Draw winners for {new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en", { month: "long", year: "numeric", timeZone: "UTC" })}?</h2><p>Choose 1–3 winners. Winners are selected randomly from approved participants and preserved for this month.</p><label className="adminRunClubWinnerCount" htmlFor="winner-count">Number of winners<select id="winner-count" value={winnerCount} onChange={(event) => setWinnerCount(Number(event.target.value))}><option value={1}>1 winner</option><option value={2}>2 winners</option><option value={3}>3 winners</option></select></label><div className="adminRunClubActions"><button className="adminPrimary" disabled={loading} onClick={() => void drawWinner()} type="button">{loading ? "Drawing..." : "CONFIRM DRAW"}</button><button className="adminSecondary" disabled={loading} onClick={() => setConfirmDrawOpen(false)} type="button">CANCEL</button></div></aside></div> : null}

      {selected ? <div className="adminRunClubModalOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) closeModal(); }}><aside className="adminRunClubModal" role="dialog" aria-modal="true" aria-labelledby="submission-detail-title"><header className="adminRunClubModal__header"><div><p>SUBMISSION DETAIL</p><h2 id="submission-detail-title">{selected.name}</h2><span>{selected.monthKey}</span></div><StatusBadge status={selected.status} /><button className="adminRunClubModal__close" type="button" onClick={closeModal} autoFocus>Close</button></header><div className="adminRunClubModal__body"><div className="adminRunClubDetail__media">{selected.proofImage ? <Image className="adminRunClubDetail__image" src={selected.proofImage.secureUrl} alt={`Full run proof submitted by ${selected.name}`} width={720} height={720} /> : <p>No proof image.</p>}</div><section className="adminRunClubInfo"><h3>Submission information</h3><dl><dt>Name</dt><dd>{selected.name}</dd><dt>Contact</dt><dd>{selected.contactType}: {selected.contactValue}</dd><dt>Instagram</dt><dd>{selected.instagram || "—"}</dd><dt>Wilaya</dt><dd>{selected.wilaya || "—"}</dd><dt>Caption</dt><dd>{selected.caption || "—"}</dd><dt>Consent</dt><dd>{selected.consentAccepted ? "Accepted" : "Missing"}</dd><dt>Submitted</dt><dd>{formatSubmitted(selected.createdAt)}</dd><dt>Month</dt><dd>{selected.monthKey}</dd><dt>Current status</dt><dd><StatusBadge status={selected.status} /></dd><dt>Image dimensions</dt><dd>{selected.proofImage ? `${selected.proofImage.width}×${selected.proofImage.height}` : "—"}</dd><dt>Format</dt><dd>{selected.proofImage?.format ?? "—"}</dd><dt>File size</dt><dd>{selected.proofImage ? formatBytes(selected.proofImage.bytes) : "—"}</dd></dl>{(isRejecting || selected.status === "rejected") ? <label className="adminRunClubRejectReason" htmlFor="rejection-reason">Rejection reason<textarea id="rejection-reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Add the reason before confirming rejection." /></label> : null}<div className="adminRunClubActions"><button className="adminPrimary" disabled={loading} onClick={() => void moderate("approve")} type="button">{loading ? "Working..." : "APPROVE"}</button><button className="adminDanger" disabled={loading} onClick={() => void moderate("reject")} type="button">{loading ? "Working..." : isRejecting || selected.status === "rejected" ? "CONFIRM REJECT" : "REJECT"}</button><button className="adminSecondary" disabled={loading} onClick={closeModal} type="button">CLOSE</button></div></section></div></aside></div> : null}
    </>
  );
}
