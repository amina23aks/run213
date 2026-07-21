"use client";

import type { MouseEvent } from "react";
import { useFavorites } from "@/context/favorites";
import type { FavoriteItemType } from "@/context/favorites-storage";

type FavoriteButtonVariant = "card" | "detail";

type FavoriteButtonProps = {
  itemType: FavoriteItemType;
  itemId: string;
  itemName: string;
  variant?: FavoriteButtonVariant;
  className?: string;
  stopPropagation?: boolean;
};

export function FavoriteButton({ itemType, itemId, itemName, variant = "card", className, stopPropagation = variant === "card" }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, isHydrated, isSyncing } = useFavorites();
  const active = isHydrated && isFavorite(itemType, itemId);
  const label = `${active ? "Remove" : "Add"} ${itemName} ${active ? "from" : "to"} favorites`;
  const classes = [variant === "card" ? "favoriteButton" : "lookActions__favorite", className].filter(Boolean).join(" ");

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (stopPropagation) {
      event.preventDefault();
      event.stopPropagation();
    }
    void toggleFavorite(itemType, itemId);
  }

  return (
    <button className={classes} type="button" aria-label={label} aria-pressed={active} disabled={!isHydrated || isSyncing} onClick={handleClick}>
      <span aria-hidden="true">{active ? "♥" : "♡"}</span>
    </button>
  );
}
