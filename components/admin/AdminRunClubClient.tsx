"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { CLOUDINARY_IMAGE_WIDTHS, cloudinaryImageUrl } from "@/lib/cloudinary-delivery";

type Status = "pending" | "approved" | "rejected" | "edit_requested" | "removal_requested";
type Submission = { id: string; name: string; contactType: string; contactValue: string; instagram: string | null; wilaya: string | null; caption: string | null; publicName: string; publicCaption: string | null; publicWilaya: string | null; monthKey: string; status: Status; baseStatus?:"pending"|"approved"|"rejected"; pendingRevision?:{caption?:string|null;wilaya?:string|null}|null; consentAccepted: boolean; proofImage: { secureUrl: string; width: number; height: number; format?: string; bytes?: number; publicId?: string } | null; createdAt: string | null; rejectionReason: string | null; customerUserId: string | null };
type PublicWinner = { submissionId: string; publicName: string; publicCaption: string | null; publicWilaya: string | null; proofImage: { secureUrl: string; width: number; height: number }; monthKey: string; winnerSelectedAt: string; placement?: number };
type Summary = { pendingCount: number; approvedCount: number; rejectedCount: number; monthlyApprovedCount: number; maximumApproved: number; remaining: number; status: "open" | "full"; eligibleDrawCount: number; currentApprovedCount?: number; remainingEligibleCount?: number; hasAdditionalEligibleParticipants?: boolean; approvedAddedAfterDrawCount?: number; drawStatus: "not_drawn" | "drawn"; winner: PublicWinner | null; winners?: PublicWinner[]; winnerCount?: number; eligibleCountAtDraw: number | null; winnerSelectedAt: string | null; approvedCountMismatch: boolean };

function formatSubmitted(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
}

function StatusBadge({ status }: { status: Status | Summary["status"] }) {
  return <span className={`adminRunClubBadge adminRunClubBadge--${status}`}>{status.toUpperCase()}</span>;
}

export function AdminRunClubClient({ defaultMonth }: { defaultMonth: string }) {
  return (
    <AdminShell title="Run Club" description="Review monthly run proof submissions.">
        <AdminRunClubWorkspace defaultMonth={defaultMonth} />
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
  const [messageTone, setMessageTone] = useState<"success" | "error" | "neutral">("neutral");
  const [appendError, setAppendError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [confirmDrawOpen, setConfirmDrawOpen] = useState(false);
  const [confirmAppendOpen, setConfirmAppendOpen] = useState(false);
  const [winnerCount, setWinnerCount] = useState(1);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUid, setLinkUid] = useState("");
  const [linkTarget, setLinkTarget] = useState<{uid:string;email:string|null}|null>(null);
  const [linkError, setLinkError] = useState("");
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
      setMessageTone("error");
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

  const closeAppendModal = useCallback(() => {
    if (loading) return;
    setConfirmAppendOpen(false);
    setAppendError("");
  }, [loading]);

  useEffect(() => {
    if (!confirmAppendOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeAppendModal(); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeAppendModal, confirmAppendOpen]);

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
      setMessageTone("success");
      closeModal();
      await load(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Moderation failed.");
      setMessageTone("error");
    } finally {
      setLoading(false);
    }
  }

  async function moderateCustomerRequest(action:"approve_edit"|"reject_edit"|"approve_removal"|"reject_removal") {
    if(!selected)return;setLoading(true);
    try{const response=await adminFetch(`/api/admin/run-club/submissions/${selected.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action})});const result=await response.json();if(!response.ok)throw new Error(result.message||"Request moderation failed.");setMessage("Customer request reviewed.");setMessageTone("success");closeModal();await load(false);}catch(error){setMessage(error instanceof Error?error.message:"Request moderation failed.");setMessageTone("error");}finally{setLoading(false);}
  }

  async function linkCustomer(confirm = false) {
    if (!selected) return;
    setLoading(true); setLinkError("");
    try {
      const response = await adminFetch(`/api/admin/run-club/submissions/${selected.id}/customer`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid: linkUid, confirm }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Customer account could not be linked.");
      if (!confirm) { setLinkTarget({ uid: result.uid, email: result.email }); return; }
      const updated = { ...selected, customerUserId: result.uid };
      setSelected(updated); setItems(current => current.map(item => item.id === updated.id ? updated : item));
      setLinkOpen(false); setLinkTarget(null); setLinkUid(""); setMessage("Customer account linked securely."); setMessageTone("success");
    } catch (error) { setLinkError(error instanceof Error ? error.message : "Customer account could not be linked."); }
    finally { setLoading(false); }
  }


  async function appendWinner() {
    setLoading(true);
    setAppendError("");
    setMessage("");
    setMessageTone("neutral");
    try {
      const response = await adminFetch(`/api/admin/run-club/months/${month}/append-winner`, { method: "POST" });
      const result: { ok?: boolean; message?: string } = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) throw new Error(result.message || "Additional winner could not be selected. Try again.");
      setConfirmAppendOpen(false);
      setAppendError("");
      await load(false);
      setMessage("ADDITIONAL WINNER SAVED. The existing winners were preserved.");
      setMessageTone("success");
    } catch (error) {
      setAppendError(error instanceof Error ? error.message : "Additional winner could not be selected. Try again.");
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
      setMessageTone("success");
      setConfirmDrawOpen(false);
      await load(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Draw failed.");
      setMessageTone("error");
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
          <div className="adminRunClubControls"><label htmlFor="run-club-month">Month<input id="run-club-month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label><label htmlFor="run-club-status">Status<select id="run-club-status" value={status} onChange={(event) => setStatus(event.target.value as Status)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="edit_requested">Edit requests</option><option value="removal_requested">Removal requests</option></select></label><button className="adminSecondary" disabled={loading} onClick={() => void load(false)} type="button">{loading ? "Refreshing..." : "Refresh"}</button></div>
          {message ? <p className={`adminNotice adminNotice--${messageTone}`} role={messageTone === "error" ? "alert" : "status"}>{message}</p> : null}
          {summary ? <section className="adminRunClubDraw" aria-labelledby="run-club-draw-title"><div><p className="adminRunClubDraw__badge">{summary.drawStatus === "drawn" ? "MONTHLY WINNER" : "MONTHLY DRAW"}</p><h3 id="run-club-draw-title">{winnerList.length ? `${winnerList.length} WINNER${winnerList.length > 1 ? "S" : ""} SAVED` : `${summary.eligibleDrawCount} eligible approved participants`}</h3>{winnerList.length ? <div className="adminRunClubDraw__explain"><span>Original draw completed with {summary.eligibleCountAtDraw ?? winnerList.length} eligible participants.</span><span>{summary.currentApprovedCount ?? summary.eligibleDrawCount} submissions are currently approved.</span><span>{summary.approvedAddedAfterDrawCount ?? 0} approved submissions were added after the original draw.</span><span>{summary.remainingEligibleCount ?? 0} approved non-winning submissions remain eligible.</span></div> : <span>Winner not selected</span>}{summary.approvedCountMismatch ? <strong className="adminRunClubDraw__warning">Counter mismatch: using {summary.eligibleDrawCount} actual eligible entries for draw.</strong> : null}</div>{winnerList.length ? <div className="adminRunClubWinners">{winnerList.map((winner, index) => <article className="adminRunClubWinner" key={winner.submissionId}><Image src={cloudinaryImageUrl(winner.proofImage.secureUrl, { width: CLOUDINARY_IMAGE_WIDTHS.adminThumbnail })} alt={`Winner proof from ${winner.publicName}`} width={72} height={72} sizes="72px" unoptimized /><div><strong>WINNER {String(winner.placement ?? index + 1).padStart(2, "0")}</strong><span>{winner.publicName}</span><small>Placement {winner.placement ?? index + 1} · Selected {formatSubmitted(winner.winnerSelectedAt)}</small></div></article>)}{summary.drawStatus === "drawn" ? summary.winnerCount && summary.winnerCount >= 3 ? <p className="adminRunClubDraw__state">MAXIMUM 3 WINNERS SAVED</p> : summary.hasAdditionalEligibleParticipants ? <button className="adminPrimary" type="button" disabled={loading} onClick={() => setConfirmAppendOpen(true)}>ADD ANOTHER WINNER</button> : <p className="adminRunClubDraw__state">NO ADDITIONAL ELIGIBLE PARTICIPANTS</p> : null}</div> : <button className="adminPrimary" type="button" disabled={loading || summary.eligibleDrawCount === 0} onClick={() => setConfirmDrawOpen(true)}>DRAW WINNER</button>}</section> : null}
          <div className="adminRunClubTable" role="table" aria-label="Run Club submissions"><div className="adminRunClubTable__head" role="row"><span>Proof</span><span>Participant</span><span>Contact</span><span>Instagram</span><span>Submitted</span><span>Status</span></div>{items.length ? items.map((item) => <div className="adminRunClubRow" key={item.id} role="row" tabIndex={0} onClick={(event) => { if ((event.target as HTMLElement).closest("button,a,input,select,textarea")) return; openModal(item, event.currentTarget); }} onKeyDown={(event) => { if (event.key !== "Enter" && event.key !== " ") return; event.preventDefault(); openModal(item, event.currentTarget); }}><span>{item.proofImage ? <Image src={cloudinaryImageUrl(item.proofImage.secureUrl, { width: CLOUDINARY_IMAGE_WIDTHS.adminThumbnail })} alt={`Run proof thumbnail for ${item.name}`} width={64} height={64} sizes="64px" unoptimized /> : null}</span><strong>{item.name}</strong><span>{item.contactType}: {item.contactValue}</span><span>{item.instagram || "—"}</span><span>{formatSubmitted(item.createdAt)}</span><StatusBadge status={item.status} /></div>) : <p className="adminRunClubEmpty">No submissions found for this month and status.</p>}</div>
          {cursor ? <button className="adminSecondary" disabled={loading} onClick={() => void load(true)} type="button">Load more</button> : null}
      </section>

      {confirmDrawOpen ? <div className="adminRunClubModalOverlay" role="presentation"><aside className="adminRunClubConfirm" role="dialog" aria-modal="true" aria-labelledby="draw-confirm-title"><h2 id="draw-confirm-title">Draw winners for {new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en", { month: "long", year: "numeric", timeZone: "UTC" })}?</h2><p>Choose 1–3 winners. Winners are selected randomly from approved participants and preserved for this month.</p><label className="adminRunClubWinnerCount" htmlFor="winner-count">Number of winners<select id="winner-count" value={winnerCount} onChange={(event) => setWinnerCount(Number(event.target.value))}><option value={1}>1 winner</option><option value={2}>2 winners</option><option value={3}>3 winners</option></select></label><div className="adminRunClubActions"><button className="adminPrimary" disabled={loading} onClick={() => void drawWinner()} type="button">{loading ? "Drawing..." : "CONFIRM DRAW"}</button><button className="adminSecondary" disabled={loading} onClick={() => setConfirmDrawOpen(false)} type="button">CANCEL</button></div></aside></div> : null}

      {confirmAppendOpen ? <div className="adminRunClubModalOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAppendModal(); }}><aside className="adminRunClubConfirm adminRunClubConfirm--append" role="dialog" aria-modal="true" aria-labelledby="append-confirm-title"><button className="adminRunClubConfirm__close" type="button" aria-label="Close additional winner dialog" disabled={loading} onClick={closeAppendModal}>×</button><h2 id="append-confirm-title">Add another winner for {new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en", { month: "long", year: "numeric", timeZone: "UTC" })}?</h2><p>One additional winner will be selected randomly from the remaining approved participants.</p><p>The existing winner will not be changed.</p>{appendError ? <div className="adminRunClubConfirm__error" role="alert">{appendError}</div> : null}<div className="adminRunClubActions"><button className="adminPrimary" disabled={loading} onClick={() => void appendWinner()} type="button">{loading ? "Selecting..." : "CONFIRM ADDITIONAL WINNER"}</button><button className="adminSecondary" disabled={loading} onClick={closeAppendModal} type="button">CANCEL</button></div></aside></div> : null}

      {linkOpen && selected ? <div className="adminRunClubModalOverlay adminRunClubLinkOverlay" role="presentation"><aside className="adminRunClubConfirm" role="dialog" aria-modal="true" aria-labelledby="link-customer-title"><h2 id="link-customer-title">LINK TO CUSTOMER ACCOUNT</h2>{linkTarget?<><p>Confirm the exact Firebase Authentication account. This does not change moderation or public visibility.</p><dl><dt>UID</dt><dd>{linkTarget.uid}</dd><dt>Email</dt><dd>{linkTarget.email || "Not available"}</dd></dl></>:<label htmlFor="customer-uid">Exact Firebase Authentication UID<input id="customer-uid" autoFocus value={linkUid} onChange={event=>{setLinkUid(event.target.value);setLinkTarget(null)}} autoComplete="off" /></label>}{linkError?<p className="adminRunClubConfirm__error" role="alert">{linkError}</p>:null}<div className="adminRunClubActions"><button className="adminPrimary" type="button" disabled={loading||!linkUid.trim()} onClick={()=>void linkCustomer(Boolean(linkTarget))}>{loading?"CHECKING…":linkTarget?"CONFIRM LINK":"VERIFY UID"}</button><button className="adminSecondary" type="button" disabled={loading} onClick={()=>{setLinkOpen(false);setLinkTarget(null);setLinkError("")}}>CANCEL</button></div></aside></div>:null}


      {selected ? <div className="adminRunClubModalOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) closeModal(); }}><aside className="adminRunClubModal" role="dialog" aria-modal="true" aria-labelledby="submission-detail-title"><header className="adminRunClubModal__header"><div><p>{selected.customerUserId?"SUBMISSION DETAIL":"LEGACY UNLINKED SUBMISSION"}</p><h2 id="submission-detail-title">{selected.name}</h2><span>{selected.monthKey}</span></div><StatusBadge status={selected.status} /><button className="adminRunClubModal__close" type="button" onClick={closeModal} autoFocus>Close</button></header><div className="adminRunClubModal__body"><div className="adminRunClubDetail__media">{selected.proofImage ? <Image className="adminRunClubDetail__image" src={cloudinaryImageUrl(selected.proofImage.secureUrl, { width: CLOUDINARY_IMAGE_WIDTHS.communityAdmin })} alt={`Full run proof submitted by ${selected.name}`} width={720} height={720} sizes="(max-width: 800px) 100vw, 720px" unoptimized /> : <p>No proof image.</p>}</div><section className="adminRunClubInfo"><h3>Submission information</h3><dl><dt>Name</dt><dd>{selected.name}</dd><dt>Contact</dt><dd>{selected.contactType}: {selected.contactValue}</dd><dt>Instagram</dt><dd>{selected.instagram || "—"}</dd><dt>Wilaya</dt><dd>{selected.wilaya || "—"}</dd><dt>Caption</dt><dd>{selected.caption || "—"}</dd>{selected.pendingRevision?<><dt>Proposed caption</dt><dd>{selected.pendingRevision.caption||"—"}</dd><dt>Proposed wilaya</dt><dd>{selected.pendingRevision.wilaya||"—"}</dd></>:null}<dt>Consent</dt><dd>{selected.consentAccepted ? "Accepted" : "Missing"}</dd><dt>Submitted</dt><dd>{formatSubmitted(selected.createdAt)}</dd><dt>Month</dt><dd>{selected.monthKey}</dd><dt>Current status</dt><dd><StatusBadge status={selected.status} /></dd><dt>Customer account</dt><dd>{selected.customerUserId ? <span className="adminRunClubLinked">CUSTOMER ACCOUNT LINKED</span> : "Not linked"}</dd></dl><div className="adminRunClubActions">{selected.customerUserId?null:<button className="adminSecondary" disabled={loading} onClick={()=>{setLinkError("");setLinkUid("");setLinkTarget(null);setLinkOpen(true)}} type="button">LINK TO CUSTOMER ACCOUNT</button>}{selected.status==="edit_requested"?<><button className="adminPrimary" disabled={loading} onClick={()=>void moderateCustomerRequest("approve_edit")}>APPROVE EDIT</button><button className="adminDanger" disabled={loading} onClick={()=>void moderateCustomerRequest("reject_edit")}>REJECT EDIT</button></>:selected.status==="removal_requested"?<><button className="adminDanger" disabled={loading} onClick={()=>void moderateCustomerRequest("approve_removal")}>APPROVE REMOVAL</button><button className="adminPrimary" disabled={loading} onClick={()=>void moderateCustomerRequest("reject_removal")}>RESTORE POST</button></>:<><button className="adminPrimary" disabled={loading} onClick={() => void moderate("approve")} type="button">APPROVE</button><button className="adminDanger" disabled={loading} onClick={() => void moderate("reject")} type="button">REJECT</button></>}<button className="adminSecondary" disabled={loading} onClick={closeModal} type="button">CLOSE</button></div></section></div></aside></div> : null}
    </>
  );
}
