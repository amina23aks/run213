"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";

export type FavoriteKind = "product" | "look";

type FavoriteSets = {
  products: Set<string>;
  looks: Set<string>;
};

type FavoriteToggleInput = {
  kind: FavoriteKind;
  id: string;
  slug?: string;
};

type FavoritesContextValue = {
  isHydrated: boolean;
  isSyncing: boolean;
  user: User | null;
  authLoading: boolean;
  productCount: number;
  lookCount: number;
  totalCount: number;
  isFavorite: (kind: FavoriteKind, id: string) => boolean;
  toggleFavorite: (input: FavoriteToggleInput) => Promise<boolean>;
};

const PRODUCT_FAVORITES_KEY = "run213:productFavorites";
const LOOK_FAVORITES_KEY = "run213:lookFavorites";
const LEGACY_KEYS = ["run213:favorites", "favorites", "productFavorites", "lookFavorites"] as const;

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readStoredIds(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0));
  } catch {
    return new Set();
  }
}

function writeStoredIds(key: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify([...ids]));
}

function cloneSets(sets: FavoriteSets): FavoriteSets {
  return { products: new Set(sets.products), looks: new Set(sets.looks) };
}

function collectionName(kind: FavoriteKind) {
  return kind === "product" ? "productFavorites" : "lookFavorites";
}

function idFieldName(kind: FavoriteKind) {
  return kind === "product" ? "productId" : "lookId";
}

function slugFieldName(kind: FavoriteKind) {
  return kind === "product" ? "productSlug" : "lookSlug";
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [sets, setSets] = useState<FavoriteSets>(() => ({
    products: readStoredIds(PRODUCT_FAVORITES_KEY),
    looks: readStoredIds(LOOK_FAVORITES_KEY),
  }));
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  const setsRef = useRef(sets);

  useEffect(() => { setsRef.current = sets; }, [sets]);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    LEGACY_KEYS.forEach((key) => window.localStorage.removeItem(key));
    const frame = window.requestAnimationFrame(() => setIsHydrated(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    writeStoredIds(PRODUCT_FAVORITES_KEY, sets.products);
    writeStoredIds(LOOK_FAVORITES_KEY, sets.looks);
  }, [isHydrated, sets]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    import("@/lib/firebase/client")
      .then(({ auth }) => import("firebase/auth").then(({ onAuthStateChanged }) => {
        unsubscribe = onAuthStateChanged(auth, (nextUser) => {
          if (cancelled) return;
          setUser(nextUser);
          setAuthLoading(false);
        });
      }))
      .catch(() => {
        if (!cancelled) setAuthLoading(false);
      });
    return () => { cancelled = true; unsubscribe?.(); };
  }, []);

  useEffect(() => {
    if (!isHydrated || authLoading || !user) return;
    let cancelled = false;
    async function mergeFavorites() {
      const authUser = userRef.current;
      if (!authUser) return;
      setIsSyncing(true);
      try {
        const [{ db }, firestore] = await Promise.all([import("@/lib/firebase/client"), import("firebase/firestore")]);
        const productCollection = firestore.collection(db, "users", authUser.uid, "productFavorites");
        const lookCollection = firestore.collection(db, "users", authUser.uid, "lookFavorites");
        const [productSnapshot, lookSnapshot] = await Promise.all([firestore.getDocs(productCollection), firestore.getDocs(lookCollection)]);
        const remoteProducts = new Set(productSnapshot.docs.map((doc) => doc.id));
        const remoteLooks = new Set(lookSnapshot.docs.map((doc) => doc.id));
        const mergedProducts = new Set([...setsRef.current.products, ...remoteProducts]);
        const mergedLooks = new Set([...setsRef.current.looks, ...remoteLooks]);
        await Promise.all([
          ...[...setsRef.current.products].filter((id) => !remoteProducts.has(id)).map((id) => firestore.setDoc(firestore.doc(db, "users", authUser.uid, "productFavorites", id), { productId: id, createdAt: firestore.serverTimestamp() }, { merge: true })),
          ...[...setsRef.current.looks].filter((id) => !remoteLooks.has(id)).map((id) => firestore.setDoc(firestore.doc(db, "users", authUser.uid, "lookFavorites", id), { lookId: id, createdAt: firestore.serverTimestamp() }, { merge: true })),
        ]);
        if (!cancelled) setSets({ products: mergedProducts, looks: mergedLooks });
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    }
    void mergeFavorites();
    return () => { cancelled = true; };
  }, [authLoading, isHydrated, user]);

  const isFavorite = useCallback((kind: FavoriteKind, id: string) => (kind === "product" ? setsRef.current.products : setsRef.current.looks).has(id), []);

  const toggleFavorite = useCallback(async ({ kind, id, slug }: FavoriteToggleInput) => {
    const currentUser = userRef.current;
    const wasFavorite = (kind === "product" ? setsRef.current.products : setsRef.current.looks).has(id);
    const previousSets = setsRef.current;
    const nextSets = cloneSets(previousSets);
    const target = kind === "product" ? nextSets.products : nextSets.looks;
    if (wasFavorite) target.delete(id); else target.add(id);
    setSets(nextSets);

    if (!currentUser) return !wasFavorite;

    try {
      const [{ db }, firestore] = await Promise.all([import("@/lib/firebase/client"), import("firebase/firestore")]);
      const ref = firestore.doc(db, "users", currentUser.uid, collectionName(kind), id);
      if (wasFavorite) await firestore.deleteDoc(ref);
      else {
        const payload: Record<string, unknown> = { [idFieldName(kind)]: id, createdAt: firestore.serverTimestamp() };
        if (slug) payload[slugFieldName(kind)] = slug;
        await firestore.setDoc(ref, payload, { merge: true });
      }
      return !wasFavorite;
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.error("[favorites] update failed", error);
      setsRef.current = previousSets;
      setSets(previousSets);
      throw error;
    }
  }, []);

  const value = useMemo<FavoritesContextValue>(() => ({
    isHydrated,
    isSyncing,
    user,
    authLoading,
    productCount: sets.products.size,
    lookCount: sets.looks.size,
    totalCount: sets.products.size + sets.looks.size,
    isFavorite,
    toggleFavorite,
  }), [authLoading, isFavorite, isHydrated, isSyncing, sets.looks.size, sets.products.size, toggleFavorite, user]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites must be used within FavoritesProvider");
  return context;
}
