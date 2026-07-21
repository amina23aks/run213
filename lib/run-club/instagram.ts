export function normalizeInstagram(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  let username = raw.toLowerCase();
  try {
    const url = new URL(username.startsWith("http") ? username : `https://${username}`);
    if (url.hostname === "instagram.com" || url.hostname === "www.instagram.com") username = url.pathname.split("/").filter(Boolean)[0] ?? "";
  } catch {}
  username = username.split("?")[0]?.replace(/^@/, "").replace(/\/$/, "") ?? "";
  if (!/^[a-z0-9._]{1,30}$/.test(username)) return null;
  return username;
}
