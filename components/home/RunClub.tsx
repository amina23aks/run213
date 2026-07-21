import Image from "next/image";
import Link from "next/link";
import { CommunityMarquee } from "@/components/community/CommunityMarquee";
import { getPublicRunClubEntries } from "@/lib/run-club/public";

const phraseIcons = [
  { text: "NO NEED TO BE FAST.", icon: "/shoes.png" },
  { text: "NO NEED TO RUN FAR.", icon: "/road.png" },
  { text: "JUST SHOW UP.", icon: "/star.png" },
];

export async function RunClub() {
  const entries = (await getPublicRunClubEntries(6)).map((entry) => ({ id: entry.id, name: entry.publicName, city: entry.publicWilaya ?? undefined, label: "Approved run", approvedDate: new Date(entry.approvedAt).toLocaleDateString("en", { month: "long", year: "numeric" }), caption: entry.publicCaption ?? undefined, image: entry.proofImage.secureUrl, imageFit: "cover" as const, alt: `Approved 213 RUN Club proof from ${entry.publicName}` }));
  return (
    <section className="home-section run-club" id="run-club" aria-labelledby="club-title">
      <aside className="section-intro run-club__intro">
        <h2 id="club-title">213 RUN CLUB</h2>
        <p>Share your run.<br />Build your streak.<br />One month. One winner.</p>
        <Link className="button button--lime" href="/run-club#submit">SUBMIT YOUR RUN <span>→</span></Link>
        <p className="run-club__tag">#213RUNCLUB <span aria-hidden="true">◎</span></p>
      </aside>
      <div className="run-club__visuals">
        {entries.length ? <CommunityMarquee entries={entries} compact /> : <p className="communityGridEmpty">No community posts yet. Be the first to show up.</p>}
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
