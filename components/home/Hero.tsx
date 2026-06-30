import Image from "next/image";

export function Hero() {
  return (
    <section className="hero" id="home" aria-labelledby="hero-title">
      <div className="hero__media" aria-hidden="true">
        <video
          className="hero__video"
          poster="/media/hero/hero-poster.webp"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        >
          <source src="/media/hero/hero-runner.mp4" type="video/mp4" />
        </video>
        <Image
          className="hero__poster"
          src="/media/hero/hero-poster.webp"
          alt="Runner moving through natural light"
          fill
          priority
          sizes="100vw"
        />
      </div>
      <div className="hero__overlay" />
      <div className="hero__content">
        <p className="eyebrow">213 RUN</p>
        <h1 id="hero-title">BUILT.<br />NOT FOUND.</h1>
        <a className="button button--lime" href="#drop-001">Shop Drop_001</a>
      </div>
    </section>
  );
}
