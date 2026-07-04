export function Hero() {
  return (
    <section className="hero" id="home" aria-labelledby="hero-title">
      <video
        className="hero__video"
        poster="/media/hero/hero-poster.webp"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Runner on an open road at sunrise"
      >
        <source src="/media/hero/hero-runner.mp4" type="video/mp4" />
      </video>
      <div className="hero__fade" />
      <div className="hero__content">
        <p className="eyebrow">213 RUN</p>
        <h1 id="hero-title">BUILT.<br />NOT FOUND.</h1>
        <p>Running lifestyle for the ones who show up.</p>
        <div className="hero__actions">
          <a className="button button--lime" href="#drop-001">SHOP DROP_001 <span>→</span></a>
          <a className="button button--ghost" href="#shop-the-look">EXPLORE LOOKS <span>→</span></a>
        </div>
        <div className="hero__pager" aria-label="Hero slide indicator"><span>01</span><b /><i /><span>03</span></div>
      </div>
    </section>
  );
}
