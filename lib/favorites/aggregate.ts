import "server-only";

import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";

export type FavoriteKind = "product" | "look";

export function favoriteAggregateId(type: FavoriteKind, itemId: string) {
  return `${type}_${itemId}`;
}

export function nextFavoriteAggregateCount(currentCount: unknown, delta: 1 | -1) {
  const parsed = typeof currentCount === "number" && Number.isFinite(currentCount) ? currentCount : 0;
  return Math.max(0, Math.trunc(parsed) + delta);
}

export function applyFavoriteAggregate(
  transaction: Transaction,
  db: Firestore,
  type: FavoriteKind,
  itemId: string,
  count: number,
) {
  const ref = db.collection("favoriteAggregates").doc(favoriteAggregateId(type, itemId));
  transaction.set(ref, {
    itemId,
    type,
    count: Math.max(0, Math.trunc(count)),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}
