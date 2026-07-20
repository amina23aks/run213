import Link from "next/link";
import Image from "next/image";
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

export default function RunClubPage() {
  const cappedCount = Math.min(runClubMonthStatus.approvedCount, runClubMonthStatus.maximumApprovedParticipants);
  const remaining = Math.max(runClubMonthStatus.maximumApprovedParticipants - cappedCount, 0);
  const isClosed = runClubMonthStatus.status === "closed" || cappedCount >= runClubMonthStatus.maximumApprovedParticipants;

  return (
    <>
      <Header />
      <main className="runClubPage">
        <section className="runClubHero" aria-labelledby="run-club-page-title">
          <div>
            <p className="eyebrow">213 RUN CLUB</p>
            <h1 id="run-club-page-title">JUST SHOW UP.</h1>
            <p>No need to be fast. No need to run far. Share your run and become part of the movement.</p>
            <div className="runClubHero__actions">
              {isClosed ? <button className="button button--lime" type="button" disabled title="Submissions are closed for this month">SUBMIT YOUR RUN →</button> : <Link className="button button--lime" href="#submit">SUBMIT YOUR RUN <span>→</span></Link>}
              <span>26 participant spots each month.</span>
            </div>
          </div>
          <Image src="/model.png" alt="213 RUN Club runner showing up for an everyday run" width={520} height={620} priority />
        </section>

        <section className="runClubStatus" aria-labelledby="monthly-status-title">
          <div><span>MONTH</span><strong id="monthly-status-title">{runClubMonthStatus.monthLabel}</strong></div>
          <div><span>APPROVED</span><strong>{cappedCount}/26</strong></div>
          <div><span>REMAINING</span><strong>{remaining}</strong></div>
          <div><span>STATUS</span><strong className={isClosed ? "is-closed" : "is-open"}>{isClosed ? "Closed" : "Open"}</strong></div>
          <p>{isClosed ? "Submissions are closed for this month." : `${remaining} approved participant spots remain. Mock UI data for this sprint.`}</p>
          <p className="runClubStatus__winner">{runClubWinner ? `${runClubWinner.name} is the ${runClubWinner.monthLabel} winner.` : "This month’s winner will be announced after the draw."}</p>
        </section>

        <section className="runClubSteps" aria-labelledby="steps-title">
          <div className="runClubSectionHeader"><span className="section-number">01</span><h2 id="steps-title">HOW IT WORKS</h2><p>Simple rules. Reviewed entries. Random winner.</p></div>
          <div className="runClubSteps__grid">
            {steps.map((step, index) => <article key={step.title}><b>{String(index + 1).padStart(2, "0")}</b><h3>{step.title}</h3><p>{step.text}</p></article>)}
          </div>
        </section>

        <section className="runClubStatement" aria-label="213 RUN Club brand statement">
          {slogans.map((slogan) => <p key={slogan.text}><Image src={slogan.icon} alt="" aria-hidden="true" width={36} height={36} /><strong>{slogan.text}</strong></p>)}
        </section>

        <section className="runClubGallery" aria-labelledby="gallery-title">
          <div className="runClubSectionHeader"><span className="section-number">02</span><h2 id="gallery-title">APPROVED COMMUNITY</h2><p>Approved static entries for the public UI sprint.</p></div>
          <div className="communityGrid">
            {approvedCommunityEntries.map((entry) => (
              <article className="communityPost" key={entry.id}>
                <Image src={entry.image} alt={entry.alt} width={420} height={525} sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw" />
                <div className="communityPost__meta"><span>APPROVED</span><strong>{entry.name}</strong><small>{[entry.city, entry.approvedDate].filter(Boolean).join(" · ")}</small>{"caption" in entry ? <p>{entry.caption}</p> : null}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="runClubSubmit" id="submit" aria-labelledby="submit-title">
          <div><span className="section-number">03</span><h2 id="submit-title">SUBMIT YOUR RUN</h2><p>Coming soon. The submission form opens in a future backend sprint.</p></div>
          <div className="submitComingSoon"><strong>{isClosed ? "SUBMISSIONS CLOSED" : "SUBMISSIONS OPENING SOON"}</strong><p>Submissions are reviewed before appearing publicly.</p><p>By submitting, you confirm that you own the content and allow 213 RUN to display approved entries.</p><button className="button button--lime" type="button" disabled>{isClosed ? "CLOSED THIS MONTH" : "COMING SOON"}</button></div>
        </section>
      </main>
      <div className="club-footer-shell"><Footer /></div>
    </>
  );
}
