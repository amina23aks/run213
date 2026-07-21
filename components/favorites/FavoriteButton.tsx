"use client";

import { useState, type MouseEvent } from "react";
import { useFavorites, type FavoriteKind } from "@/context/favorites";

type FavoriteButtonProps = {
  kind: FavoriteKind;
  id: string;
  slug?: string;
  label: string;
  className?: string;
  onError?: (message: string) => void;
  onClickCapture?: (event: MouseEvent<HTMLButtonElement>) => void;
};

export function FavoriteButton({ kind, id, slug, label, className, onError, onClickCapture }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, isHydrated, isSyncing } = useFavorites();
  const [isBusy, setIsBusy] = useState(false);
  const active = isFavorite(kind, id);

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClickCapture?.(event);
    if (isBusy) return;
    setIsBusy(true);
    try {
      await toggleFavorite({ kind, id, slug });
    } catch {
      onError?.("Could not update favorite. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <button
      className={className}
      type="button"
      aria-label={`${active ? "Remove" : "Save"} ${label}`}
      aria-pressed={active}
      disabled={!isHydrated || isBusy || isSyncing}
      onClick={handleClick}
    >
      <span aria-hidden="true">{active ? "♥" : "♡"}</span>
    </button>
  );
}
