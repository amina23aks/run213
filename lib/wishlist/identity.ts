import "server-only";

import { createHmac } from "node:crypto";

const MINIMUM_PEPPER_BYTES = 32;

export function normalizeWishlistEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getWishlistDocumentId(normalizedEmail: string, encodedPepper = process.env.WISHLIST_ID_PEPPER): string {
  const pepper = decodePepper(encodedPepper);
  return createHmac("sha256", pepper).update(normalizedEmail, "utf8").digest("hex");
}

function decodePepper(value: string | undefined): Buffer {
  if (!value) throw new Error("Wishlist identity protection is unavailable.");

  const pepper = Buffer.from(value, "base64");
  if (pepper.byteLength < MINIMUM_PEPPER_BYTES) {
    throw new Error("Wishlist identity protection is unavailable.");
  }
  return pepper;
}
