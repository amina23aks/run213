import Image from "next/image";
import { CommunityGrid } from "@/components/community/CommunityGrid";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { approvedCommunityEntries, runClubMonthStatus, runClubWinner } from "@/constants/home";

const steps = [
  { title: "RUN AT YOUR PACE", text: "No minimum distance or speed." },
  { title: "SAVE YOUR PROOF", text: "Take a run photo or app screenshot." },
  { title: "SUBMIT YOUR RUN", text: "One entry per person each month." },
  { title: "GET APPROVED", text: "A maximum of 26 valid entries are approved." },
  { title: "JOIN THE DRAW", text: "The winner is selected randomly from approved entries." },
];

const slogans = [
  { text: "NO NEED TO BE FAST.", icon: "/shoes.png" },
  { text: "NO NEED TO RUN FAR.", icon: "/road.png" },
  { text: "JUST SHOW UP.", icon: "/star.png" },
];

const plannedFields = ["Name", "Email or phone", "Instagram optional", "Wilaya optional", "Run proof image", "Run caption optional"];

export default function RunClubPage() {
  const cappedCount = Math.min(runClubMonthStatus.approvedCount, runClubMonthStatus.maximumApprovedParticipants);
  const remaining = Math.max(runClubMonthStatus.maximumApprovedParticipants - cappedCount, 0);
  const isClosed = runClubMonthStatus.status === "closed" || cappedCount >= runClubMonthStatus.maximumApprovedParticipants;
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
            <span className="section-number">01</span>
            <h2 id="submit-title">SUBMIT YOUR RUN</h2>
            <p>Submissions are reviewed before appearing publicly.</p>
            <p>By submitting, you confirm that you own the content and allow 213 RUN to display approved entries.</p>
          </div>
          <div className="submitComingSoon" aria-label="Disabled submission preview coming soon">
            <div className="submitPreviewFields">
              {plannedFields.map((field) => field === "Run caption optional" ? <span className="submitPreviewFields__caption" key={field}>{field}</span> : <span key={field}>{field}</span>)}
            </div>
            <button className="button button--lime" type="button" disabled>{isClosed ? "SUBMISSIONS CLOSED" : "SUBMISSIONS OPENING SOON"}</button>
          </div>
        </section>

        <section className="runClubSteps" aria-labelledby="steps-title">
          <div className="runClubSectionHeader"><span className="section-number">02</span><h2 id="steps-title">HOW IT WORKS</h2><p>Simple rules. Reviewed entries. Random winner.</p></div>
          <div className="runClubSteps__grid">
            {steps.map((step, index) => <article key={step.title}><b>{String(index + 1).padStart(2, "0")}</b><h3>{step.title}</h3><p>{step.text}</p></article>)}
          </div>
        </section>

        <section className="runClubStatement" aria-label="213 RUN Club brand statement">
          {slogans.map((slogan) => <p key={slogan.text}><Image src={slogan.icon} alt="" aria-hidden="true" width={36} height={36} /><strong>{slogan.text}</strong></p>)}
        </section>

        <section className="runClubGallery" aria-labelledby="gallery-title">
          <div className="runClubSectionHeader"><span className="section-number">03</span><h2 id="gallery-title">213 COMMUNITY</h2><p>Runs, proof, and moments from people who showed up.</p></div>
          <CommunityGrid entries={approvedCommunityEntries} />
        </section>

        <section className="runClubMonthlySummary" aria-labelledby="monthly-status-title">
          <h2 id="monthly-status-title">{runClubMonthStatus.monthLabel.toUpperCase()}</h2>
          <div><strong>{cappedCount} / 26 APPROVED</strong><strong>{remaining} SPOTS REMAIN</strong><strong>{statusLabel}</strong></div>
          <p>{runClubWinner ? `${runClubWinner.name} is the ${runClubWinner.monthLabel} winner.` : "This month’s winner will be announced after the draw."}</p>
        </section>
      </main>
      <div className="club-footer-shell"><Footer /></div>
    </>
  );
}
