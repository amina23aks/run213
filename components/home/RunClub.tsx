import Image from "next/image";

const proofCards = ["5.12 KM", "3.40 KM", "7.01 KM"];

export function RunClub() {
  return (
    <section className="section run-club" id="213-run-club" aria-labelledby="club-title">
      <div className="run-club__copy">
        <p className="eyebrow">213 RUN CLUB</p>
        <h2 id="club-title">Share your run.<br />Build your streak.<br />One month. One winner.</h2>
        <p>No need to be fast.<br />No need to run far.<br />Just show up.</p>
        <a className="button button--dark" href="#213-run-club">Submit your run</a>
      </div>
      <div className="proof-grid" aria-label="Example approved run proof cards">
        {proofCards.map((distance) => (
          <article className="proof-card" key={distance}>
            <Image src="/media/placeholders/community-proof-placeholder.webp" alt={`Community run proof placeholder showing ${distance}`} width={360} height={460} />
            <span>{distance}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
