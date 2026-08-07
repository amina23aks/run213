"use client";

import { useState, type FormEvent } from "react";

export function FooterClubForm() {
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = new FormData(form).get("email");
    setState("saving");
    const response = await fetch("/api/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => null);
    if (!response?.ok) { setState("error"); return; }
    form.reset();
    setState("done");
  }
  return (
    <form className="site-footer__club" onSubmit={submit}>
      <h3>JOIN THE CLUB</h3>
      <p>Get early access to new drops and exclusive offers.</p>
      <label>
        <span>Email address</span>
        <input name="email" type="email" placeholder="Enter your email" required maxLength={254} />
        <button type="submit" aria-label="Join the club" disabled={state === "saving"}>→</button>
      </label>
      <small aria-live="polite">{state === "done" ? "You’re on the list." : state === "error" ? "Could not join. Try again." : "Privacy Policy · Terms of Service"}</small>
    </form>
  );
}
