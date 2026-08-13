"use client";

import { useState, type FormEvent } from "react";

export function FooterClubForm() {
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = data.get("email");
    const website = data.get("website");
    setState("saving");
    const response = await fetch("/api/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, website }) }).catch(() => null);
    if (!response?.ok) { setState("error"); return; }
    form.reset();
    setState("done");
  }
  return (
    <form className="site-footer__club" onSubmit={submit}>
      <h3>JOIN THE CLUB</h3>
      <p>Get early access to new drops and exclusive offers.</p>
      <label aria-hidden="true" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>
        <span>Website</span>
        <input autoComplete="off" name="website" tabIndex={-1} type="text" />
      </label>
      <label>
        <span>Email address</span>
        <input name="email" type="email" placeholder="Enter your email" required maxLength={254} />
        <button type="submit" aria-label="Join the club" disabled={state === "saving"}>→</button>
      </label>
      <small aria-live="polite">{state === "done" ? "You’re on the list." : state === "error" ? "Could not join. Try again." : "No noise. Just new drops."}</small>
    </form>
  );
}
