import "server-only";

import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";

export type FavoriteKind = "product" | "look";

export function favoriteAggregateId(type: FavoriteKind, itemId: string) {
  return `${type}_${itemId}`;
}

export function applyFavoriteAggregate(
  transaction: Transaction,
  db: Firestore,
  type: FavoriteKind,
  itemId: string,
  delta: 1 | -1,
) {
  const ref = db.collection("favoriteAggregates").doc(favoriteAggregateId(type, itemId));
  transaction.set(ref, {
    itemId,
    type,
    count: FieldValue.increment(delta),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}
