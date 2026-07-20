import Image from "next/image";
import Link from "next/link";
import { CommunityMarquee } from "@/components/community/CommunityMarquee";
import { approvedCommunityEntries } from "@/constants/home";

const phraseIcons = [
  { text: "NO NEED TO BE FAST.", icon: "/shoes.png" },
  { text: "NO NEED TO RUN FAR.", icon: "/road.png" },
  { text: "JUST SHOW UP.", icon: "/star.png" },
];

export function RunClub() {
  return (
    <section className="home-section run-club" id="run-club" aria-labelledby="club-title">
      <aside className="section-intro run-club__intro">
        <h2 id="club-title">213 RUN CLUB</h2>
        <p>Share your run.<br />Build your streak.<br />One month. One winner.</p>
        <Link className="button button--lime" href="/run-club#submit">SUBMIT YOUR RUN <span>→</span></Link>
        <p className="run-club__tag">#213RUNCLUB <span aria-hidden="true">◎</span></p>
      </aside>
      <div className="run-club__visuals">
        <CommunityMarquee entries={approvedCommunityEntries.slice(0, 6)} compact />
        <div className="run-club__phrases">
          {phraseIcons.map((phrase) => (
            <p key={phrase.text}>
              <Image src={phrase.icon} alt="" aria-hidden="true" width={36} height={36} />
              <strong>{phrase.text}</strong>
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
