import Image from "next/image";
import { runClubCards } from "@/constants/home";

export function RunClub() {
  return (
    <section className="home-section run-club" id="run-club" aria-labelledby="club-title">
      <aside className="section-intro run-club__intro">
        <h2 id="club-title">213 RUN CLUB</h2>
        <p>Share your run.<br />Build your streak.<br />One month. One winner.</p>
        <a className="button button--lime" href="#run-club">SUBMIT YOUR RUN <span>→</span></a>
        <p className="run-club__tag">#213RUNCLUB <span aria-hidden="true">◎</span></p>
      </aside>
      <div className="run-club__visuals">
        <div className="run-club__cards">
          {runClubCards.map((card) => (
            <Image key={card.label} src={card.image} alt={card.label} width={420} height={280} />
          ))}
        </div>
        <div className="run-club__phrases">
          <p><span aria-hidden="true">⌁</span><strong>NO NEED TO BE FAST.</strong></p>
          <p><span aria-hidden="true">♡</span><strong>NO NEED TO RUN FAR.</strong></p>
          <p><span aria-hidden="true">♙</span><strong>JUST SHOW UP.</strong></p>
        </div>
      </div>
    </section>
  );
}
