import Link from "next/link";
import Image from "next/image";
import { CommunityMarquee } from "@/components/community/CommunityMarquee";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { approvedCommunityEntries, runClubMonthStatus, runClubWinner } from "@/constants/home";

const rules = [
  "Maximum 26 approved participants per month.",
  "No minimum distance and no speed requirement.",
  "Any running level is welcome.",
  "A real run proof image or app screenshot is required.",
  "Every submission is reviewed before appearing publicly.",
  "One accepted entry per person per month.",
  "The winner is chosen randomly from valid approved participants.",
  "Distance and speed do not improve the chance of winning.",
];

const howItWorks = ["Run your pace.", "Save a real proof image or app screenshot.", "Submit when monthly entries open.", "Approved entries join the gallery and monthly draw."];

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
        </section>

        <section className="runClubContentGrid">
          <article className="runClubPanel"><span className="section-number">01</span><h2>HOW IT WORKS</h2>{howItWorks.map((item, index) => <p key={item}><b>{String(index + 1).padStart(2, "0")}</b>{item}</p>)}</article>
          <article className="runClubPanel"><span className="section-number">02</span><h2>PARTICIPATION RULES</h2>{rules.map((rule) => <p key={rule}>→ {rule}</p>)}</article>
        </section>

        <section className="runClubStatement" aria-label="213 RUN Club brand statement"><strong>NO NEED TO BE FAST.</strong><strong>NO NEED TO RUN FAR.</strong><strong>JUST SHOW UP.</strong></section>

        <section className="runClubGallery" aria-labelledby="gallery-title"><div className="runClubSectionHeader"><span className="section-number">03</span><h2 id="gallery-title">APPROVED COMMUNITY</h2><p>Static approved placeholders only for this public UI sprint.</p></div><CommunityMarquee entries={approvedCommunityEntries} /></section>

        <section className="runClubWinner" aria-labelledby="winner-title"><div><span className="section-number">04</span><h2 id="winner-title">MONTHLY WINNER</h2>{runClubWinner ? <p>{runClubWinner.name}</p> : <p>This month’s winner will be announced after the draw.</p>}</div></section>

        <section className="runClubSubmit" id="submit" aria-labelledby="submit-title"><div><span className="section-number">05</span><h2 id="submit-title">SUBMIT YOUR RUN</h2><p>Coming soon. Submissions will be reviewed before appearing publicly.</p></div><div className="submitPreview" aria-label="Coming soon submission fields">{["Name", "Email or phone", "Instagram optional", "Wilaya optional", "Run proof image", "Short note optional", "Consent checkbox"].map((field) => <span key={field}>{field}</span>)}<button className="button button--lime" type="button" disabled>{isClosed ? "SUBMISSIONS CLOSED" : "COMING SOON"}</button></div></section>
      </main>
      <div className="club-footer-shell"><Footer /></div>
    </>
  );
}
