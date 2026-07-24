import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const PREFIX = "run213_order_access";

export function createCustomerAccessToken() { return randomBytes(32).toString("base64url"); }
export function hashCustomerAccessToken(token: string) { return createHash("sha256").update(`${PREFIX}:${token}`).digest("hex"); }
export function verifyCustomerAccessToken(token: string, storedHash: string | null | undefined) {
  if (!token || !storedHash) return false;
  const actual = Buffer.from(hashCustomerAccessToken(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function parseGuestAccessHeader(value: string | null) {
  if (!value) return [] as Array<{ orderId: string; token: string }>;
  return value.split(",").map((part) => part.trim()).flatMap((part) => {
    const [orderId, token] = part.split(":");
    return orderId && token ? [{ orderId, token }] : [];
  }).slice(0, 12);
}
