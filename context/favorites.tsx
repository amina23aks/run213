"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isFirebaseClientConfigured } from "@/lib/env";
import { FAVORITES_STORAGE_KEY, clearStoredFavorites, isValidFavoriteId, parseStoredFavorites, readStoredFavorites, writeStoredFavorites, type FavoriteItemType } from "@/context/favorites-storage";

type FavoriteArrays = { productIds: string[]; lookIds: string[] };

type FavoritesContextValue = {
  productIds: string[];
  lookIds: string[];
  isHydrated: boolean;
  isSyncing: boolean;
  error: string | null;
  isFavorite: (type: FavoriteItemType, itemId: string) => boolean;
  toggleFavorite: (type: FavoriteItemType, itemId: string) => Promise<void>;
  addFavorite: (type: FavoriteItemType, itemId: string) => Promise<void>;
  removeFavorite: (type: FavoriteItemType, itemId: string) => Promise<void>;
  retry: () => Promise<void>;
  productFavoriteCount: number;
  lookFavoriteCount: number;
  totalFavoriteCount: number;
};

type FirebaseDeps = typeof import("firebase/firestore") & { auth: import("firebase/auth").Auth; db: import("firebase/firestore").Firestore };

const FavoritesContext = createContext<FavoritesContextValue | null>(null);
const FAVORITES_ERROR = "Favorites could not sync. Your saved items are safe; please try again.";

function withoutId(ids: string[], itemId: string) { return ids.filter((id) => id !== itemId); }
function withId(ids: string[], itemId: string) { return ids.includes(itemId) ? ids : [...ids, itemId]; }
function collectionName(type: FavoriteItemType) { return type === "product" ? "productFavorites" : "lookFavorites"; }
function idsKey(type: FavoriteItemType): keyof FavoriteArrays { return type === "product" ? "productIds" : "lookIds"; }
function unique(ids: string[]) { return [...new Set(ids.filter(isValidFavoriteId))]; }
function unionFavorites(left: FavoriteArrays, right: FavoriteArrays): FavoriteArrays {
  return { productIds: unique([...left.productIds, ...right.productIds]), lookIds: unique([...left.lookIds, ...right.lookIds]) };
}

async function loadFirebase(): Promise<FirebaseDeps> {
  const [client, firestore] = await Promise.all([import("@/lib/firebase/client"), import("firebase/firestore")]);
  return { auth: client.auth, db: client.db, ...firestore };
}

async function readRemoteFavorites(deps: FirebaseDeps, uid: string): Promise<FavoriteArrays> {
  const [productSnapshot, lookSnapshot] = await Promise.all([
    deps.getDocs(deps.collection(deps.db, "users", uid, "productFavorites")),
    deps.getDocs(deps.collection(deps.db, "users", uid, "lookFavorites")),
  ]);
  return {
    productIds: unique(productSnapshot.docs.map((docSnap) => docSnap.id)),
    lookIds: unique(lookSnapshot.docs.map((docSnap) => docSnap.id)),
  };
}

async function writeMissingFavorites(deps: FirebaseDeps, uid: string, missing: FavoriteArrays) {
  const writes = [
    ...missing.productIds.map((itemId) => ({ type: "product" as const, itemId })),
    ...missing.lookIds.map((itemId) => ({ type: "look" as const, itemId })),
  ];
  for (let index = 0; index < writes.length; index += 450) {
    const batch = deps.writeBatch(deps.db);
    writes.slice(index, index + 450).forEach(({ type, itemId }) => {
      batch.set(deps.doc(deps.db, "users", uid, collectionName(type), itemId), { itemId, createdAt: deps.serverTimestamp() });
    });
    await batch.commit();
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteArrays>({ productIds: [], lookIds: [] });
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const depsRef = useRef<FirebaseDeps | null>(null);
  const authReadyRef = useRef(false);
  const mergeKeyRef = useRef<string | null>(null);
  const initSeqRef = useRef(0);

  const initializeForGuest = useCallback(() => {
    const stored = readStoredFavorites();
    userIdRef.current = null;
    setFavorites({ productIds: stored.productIds, lookIds: stored.lookIds });
    setIsHydrated(true);
    setIsSyncing(false);
    setError(null);
  }, []);

  const initializeForUser = useCallback(async (uid: string, deps: FirebaseDeps, sequence: number) => {
    setIsSyncing(true);
    setIsHydrated(false);
    setError(null);
    userIdRef.current = uid;
    const local = readStoredFavorites();
    try {
      const remote = await readRemoteFavorites(deps, uid);
      if (sequence !== initSeqRef.current || userIdRef.current !== uid) return;
      const missing = {
        productIds: local.productIds.filter((id) => !remote.productIds.includes(id)),
        lookIds: local.lookIds.filter((id) => !remote.lookIds.includes(id)),
      };
      const merged = unionFavorites(remote, local);
      const mergeKey = `${uid}:${local.productIds.join("|")}:${local.lookIds.join("|")}`;
      if ((missing.productIds.length || missing.lookIds.length) && mergeKeyRef.current !== mergeKey) {
        mergeKeyRef.current = mergeKey;
        await writeMissingFavorites(deps, uid, missing);
        clearStoredFavorites();
      }
      if (sequence !== initSeqRef.current || userIdRef.current !== uid) return;
      setFavorites(merged);
      setIsHydrated(true);
    } catch (syncError) {
      if (process.env.NODE_ENV !== "production") console.error("[favorites] authenticated sync failed", syncError);
      if (sequence !== initSeqRef.current || userIdRef.current !== uid) return;
      setFavorites((current) => unionFavorites(current, local));
      setIsHydrated(true);
      setError(FAVORITES_ERROR);
    } finally {
      if (sequence === initSeqRef.current) setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    queueMicrotask(() => { if (!cancelled) initializeForGuest(); });
    if (!isFirebaseClientConfigured()) {
      authReadyRef.current = true;
      return undefined;
    }
    loadFirebase().then(async (deps) => {
      if (cancelled) return;
      depsRef.current = deps;
      const authModule = await import("firebase/auth");
      if (cancelled) return;
      unsubscribe = authModule.onAuthStateChanged(deps.auth, (user) => {
        const sequence = ++initSeqRef.current;
        authReadyRef.current = true;
        if (!user) {
          mergeKeyRef.current = null;
          initializeForGuest();
          return;
        }
        void initializeForUser(user.uid, deps, sequence);
      });
    }).catch((firebaseError) => {
      if (process.env.NODE_ENV !== "production") console.error("[favorites] Firebase initialization failed", firebaseError);
      authReadyRef.current = true;
      initializeForGuest();
    });
    return () => { cancelled = true; unsubscribe?.(); };
  }, [initializeForGuest, initializeForUser]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== FAVORITES_STORAGE_KEY || userIdRef.current) return;
      const next = parseStoredFavorites(event.newValue);
      setFavorites({ productIds: next.productIds, lookIds: next.lookIds });
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const persistGuest = useCallback((next: FavoriteArrays) => {
    writeStoredFavorites({ ...next, updatedAt: Date.now() });
  }, []);

  const setFavoriteState = useCallback(async (type: FavoriteItemType, itemId: string, shouldFavorite: boolean) => {
    if (!isValidFavoriteId(itemId)) return;
    const key = idsKey(type);
    let previous: FavoriteArrays | null = null;
    let nextState: FavoriteArrays | null = null;
    setFavorites((current) => {
      const exists = current[key].includes(itemId);
      if (exists === shouldFavorite) return current;
      previous = current;
      nextState = { ...current, [key]: shouldFavorite ? withId(current[key], itemId) : withoutId(current[key], itemId) };
      return nextState;
    });
    if (!nextState || !previous) return;
    setError(null);
    const uid = userIdRef.current;
    if (!uid) { persistGuest(nextState); return; }
    const deps = depsRef.current;
    if (!deps || !authReadyRef.current) return;
    setIsSyncing(true);
    try {
      const ref = deps.doc(deps.db, "users", uid, collectionName(type), itemId);
      if (shouldFavorite) await deps.setDoc(ref, { itemId, createdAt: deps.serverTimestamp() });
      else await deps.deleteDoc(ref);
    } catch (writeError) {
      if (process.env.NODE_ENV !== "production") console.error("[favorites] toggle failed", writeError);
      setFavorites(previous);
      setError(FAVORITES_ERROR);
    } finally {
      setIsSyncing(false);
    }
  }, [persistGuest]);

  const isFavorite = useCallback((type: FavoriteItemType, itemId: string) => favorites[idsKey(type)].includes(itemId), [favorites]);
  const addFavorite = useCallback((type: FavoriteItemType, itemId: string) => setFavoriteState(type, itemId, true), [setFavoriteState]);
  const removeFavorite = useCallback((type: FavoriteItemType, itemId: string) => setFavoriteState(type, itemId, false), [setFavoriteState]);
  const toggleFavorite = useCallback((type: FavoriteItemType, itemId: string) => setFavoriteState(type, itemId, !favorites[idsKey(type)].includes(itemId)), [favorites, setFavoriteState]);
  const retry = useCallback(async () => {
    const uid = userIdRef.current;
    const deps = depsRef.current;
    if (uid && deps) await initializeForUser(uid, deps, ++initSeqRef.current);
    else initializeForGuest();
  }, [initializeForGuest, initializeForUser]);

  const value = useMemo<FavoritesContextValue>(() => ({
    productIds: [...favorites.productIds],
    lookIds: [...favorites.lookIds],
    isHydrated,
    isSyncing,
    error,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    retry,
    productFavoriteCount: favorites.productIds.length,
    lookFavoriteCount: favorites.lookIds.length,
    totalFavoriteCount: favorites.productIds.length + favorites.lookIds.length,
  }), [addFavorite, error, favorites, isFavorite, isHydrated, isSyncing, removeFavorite, retry, toggleFavorite]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites must be used within FavoritesProvider");
  return context;
}
