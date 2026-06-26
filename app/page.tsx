export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-void px-6 py-24 text-chalk">
      <section className="mx-auto flex w-full max-w-3xl flex-col items-start gap-8 border border-border bg-ground px-6 py-10 sm:px-10 sm:py-14">
        <p className="text-[10px] font-medium uppercase leading-[1.4] tracking-[0.12em] text-sand sm:text-[11px]">
          Sprint 0 foundation ready.
        </p>
        <div className="space-y-4">
          <h1 className="text-5xl font-light leading-[0.95] tracking-[-0.04em] text-chalk sm:text-7xl lg:text-8xl">
            RUN 213
          </h1>
          <p className="max-w-xl text-[15px] leading-[1.65] text-stone sm:text-base">
            Built for runners. Made in Algeria.
          </p>
        </div>
        <a
          className="inline-flex h-13 w-full items-center justify-center bg-ember px-6 text-[11px] font-medium uppercase leading-none tracking-[0.08em] text-white transition duration-150 ease-out hover:brightness-110 active:scale-[0.97] sm:h-12 sm:w-auto sm:min-w-40"
          href="/shop"
        >
          Shop Drop 01
        </a>
      </section>
    </main>
  );
}
