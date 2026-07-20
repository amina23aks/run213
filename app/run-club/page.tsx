import type { Metadata } from "next";
import { ApprovedCommunityMarquee } from "@/components/community/ApprovedCommunityMarquee";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { approvedCommunityEntries, currentRunClubMonth } from "@/constants/run-club";

export const metadata: Metadata = {
  title: "213 RUN Club | 213 RUN",
  description: "Share your run, build your streak, and join the 213 RUN movement.",
};

const remainingSpots = Math.max(0, currentRunClubMonth.maximumApprovedParticipants - currentRunClubMonth.approvedCount);

export default function RunClubPage() {
  return (
    <>
      <Header />
      <main className="runClubPage">
        <section className="runClubHero" aria-labelledby="run-club-page-title">
          <div>
            <span className="runClubEyebrow">213 RUN CLUB</span>
            <h1 id="run-club-page-title">JUST SHOW UP.</h1>
            <p>No need to be fast. No need to run far. Share your run and become part of the movement.</p>
            <div className="runClubHero__actions">
              <a className="button button--lime" href="#submit-run">SUBMIT YOUR RUN <span>→</span></a>
              <span>26 participant spots each month.</span>
            </div>
          </div>
        </section>

        <section className="runClubStatus" aria-label="Monthly participation status">
          <div>
            <span>CURRENT MONTH</span>
            <strong>{currentRunClubMonth.monthLabel}</strong>
          </div>
          <div>
            <span>APPROVED</span>
            <strong>{currentRunClubMonth.approvedCount}/{currentRunClubMonth.maximumApprovedParticipants}</strong>
          </div>
          <div>
            <span>REMAINING</span>
            <strong>{remainingSpots}</strong>
          </div>
          <div>
            <span>STATUS</span>
            <strong className={currentRunClubMonth.status === "open" ? "is-open" : "is-closed"}>{currentRunClubMonth.status}</strong>
          </div>
        </section>

        <section className="runClubGrid" aria-labelledby="how-it-works-title">
          <div className="runClubPanel">
            <span>01</span>
            <h2 id="how-it-works-title">HOW IT WORKS</h2>
            <ol>
              <li>Go for your run at your pace.</li>
              <li>Save a route screenshot or proof photo.</li>
              <li>Submit it for approval before the monthly cap closes.</li>
            </ol>
          </div>
          <div className="runClubPanel">
            <span>02</span>
            <h2>PARTICIPATION RULES</h2>
            <ul>
              <li>Approved entries only appear publicly.</li>
              <li>One approved participation per runner each month.</li>
              <li>Keep the proof clear, respectful, and run-related.</li>
            </ul>
          </div>
        </section>

        <section className="runClubSection" aria-labelledby="community-gallery-title">
          <div className="runClubSection__heading">
            <span>03</span>
            <h2 id="community-gallery-title">COMMUNITY GALLERY</h2>
            <p>Approved runs from the movement. Static examples for this UI sprint.</p>
          </div>
          <ApprovedCommunityMarquee entries={approvedCommunityEntries} />
        </section>

        <section className="runClubGrid" aria-labelledby="winner-title">
          <div className="runClubPanel runClubPanel--winner">
            <span>04</span>
            <h2 id="winner-title">MONTHLY WINNER</h2>
            <p>One approved participant is selected each month. The goal is consistency, not elite speed.</p>
            <strong>ONE MONTH. ONE WINNER.</strong>
          </div>
          <div className="runClubPanel" id="submit-run">
            <span>05</span>
            <h2>SUBMIT YOUR RUN</h2>
            <p>Submission form comes later with review before public display. For now, share your proof through the official channel.</p>
            <a className="button button--lime" href="mailto:club@213run.com?subject=213%20RUN%20Club%20Submission">SUBMIT YOUR RUN <span>→</span></a>
          </div>
        </section>
      </main>
      <div className="club-footer-shell"><Footer /></div>
    </>
  );
}
