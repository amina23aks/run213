import Image from "next/image";
import { CommunityGrid } from "@/components/community/CommunityGrid";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { RunClubSubmissionForm } from "@/components/run-club/RunClubSubmissionForm";
import { getPublicRunClubEntries, getPublicRunClubWinners, getRunClubMonthStatus } from "@/lib/run-club/public";

const steps = [
  { title: "RUN AT YOUR PACE", text: "No minimum distance or speed." },
  { title: "SAVE YOUR PROOF", text: "Take a run photo or app screenshot." },
  { title: "SUBMIT YOUR RUN", text: "One entry per person each month." },
  { title: "GET APPROVED", text: "A maximum of 26 valid entries are approved." },
  { title: "JOIN THE DRAW", text: "One to three winners are selected randomly from approved entries." },
];

const slogans = [
  { text: "NO NEED TO BE FAST.", icon: "/shoes.png" },
  { text: "NO NEED TO RUN FAR.", icon: "/road.png" },
  { text: "JUST SHOW UP.", icon: "/star.png" },
];


export default async function RunClubPage() {
  const [runClubMonthStatus, publicEntries, monthlyWinners] = await Promise.all([getRunClubMonthStatus(), getPublicRunClubEntries(60), getPublicRunClubWinners()]);
  const approvedEntries = publicEntries.map((entry) => ({ id: entry.id, name: entry.publicName, city: entry.publicWilaya ?? undefined, approvedDate: new Date(entry.approvedAt).toLocaleDateString("en", { month: "long", year: "numeric" }), caption: entry.publicCaption ?? undefined, image: entry.proofImage.secureUrl, imageFit: "cover" as const, alt: `Approved 213 RUN Club proof from ${entry.publicName}` }));
  const cappedCount = Math.min(runClubMonthStatus.approvedCount, runClubMonthStatus.maximumApprovedParticipants);
  const remaining = Math.max(runClubMonthStatus.maximumApprovedParticipants - cappedCount, 0);
  const isClosed = runClubMonthStatus.status === "full" || cappedCount >= runClubMonthStatus.maximumApprovedParticipants;
  const statusLabel = isClosed ? "CLOSED" : "OPEN";

  return (
    <>
      <Header />
      <main className="runClubPage">
        <section className="runClubIntro" aria-labelledby="run-club-page-title">
          <p className="eyebrow">213 RUN CLUB</p>
          <h1 id="run-club-page-title">JUST SHOW UP.</h1>
          <p>Share your run. Join the movement. Every approved entry has the same chance to win.</p>
        </section>

        <section className="runClubSubmit" id="submit" aria-labelledby="submit-title">
          <div>
            <h2 id="submit-title">SUBMIT YOUR RUN</h2>
            <p>Submissions are reviewed before appearing publicly.</p>
            <p>By submitting, you confirm that you own the content and allow 213 RUN to display approved entries.</p>
          </div>
          <RunClubSubmissionForm isClosed={isClosed} />
        </section>

        <section className="runClubSteps" aria-labelledby="steps-title">
          <div className="runClubSectionHeader"><h2 id="steps-title">HOW IT WORKS</h2><p>Simple rules. Reviewed entries. Random winner.</p></div>
          <div className="runClubSteps__grid">
            {steps.map((step, index) => <article key={step.title}><b>{String(index + 1).padStart(2, "0")}</b><h3>{step.title}</h3><p>{step.text}</p></article>)}
          </div>
        </section>

        <section className="runClubStatement" aria-label="213 RUN Club brand statement">
          {slogans.map((slogan) => <p key={slogan.text}><Image src={slogan.icon} alt="" aria-hidden="true" width={36} height={36} /><strong>{slogan.text}</strong></p>)}
        </section>

        <section className="runClubGallery" aria-labelledby="gallery-title">
          <div className="runClubSectionHeader"><h2 id="gallery-title">213 COMMUNITY</h2><p>Runs, proof, and moments from people who showed up.</p></div>
          <CommunityGrid entries={approvedEntries} />
        </section>

        <section className="runClubMonthlySummary" aria-labelledby="monthly-status-title">
          <h2 id="monthly-status-title">{runClubMonthStatus.monthLabel.toUpperCase()}</h2>
          <div><strong>{cappedCount} / 26 APPROVED</strong><strong>{remaining} SPOTS REMAIN</strong><strong>{statusLabel}</strong></div>
          <div className="runClubWinnerPanel"><span className="runClubWinnerBadge">MONTHLY WINNER</span>{monthlyWinners.length ? <div className="runClubWinnerList">{monthlyWinners.map((winner) => <article className="runClubWinnerCard" key={winner.submissionId}><Image src={winner.proofImage.secureUrl} alt={`Monthly winner proof from ${winner.publicName}`} width={160} height={120} /><div><strong>{winner.placement ? `WINNER ${winner.placement}` : "WINNER"}</strong><h3>{winner.publicName}</h3><p>{[winner.publicWilaya, runClubMonthStatus.monthLabel].filter(Boolean).join(" · ")}</p>{winner.publicCaption ? <small>{winner.publicCaption}</small> : null}</div></article>)}</div> : <p>This month’s winner will be announced after the draw.</p>}</div>
        </section>
      </main>
      <div className="club-footer-shell"><Footer /></div>
    </>
  );
}
