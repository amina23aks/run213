import type { ProductColor } from "@/types/product";

export function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : null;
}

export function normalizeProductColors(input: unknown): ProductColor[] {
  if (!Array.isArray(input)) return [];

  return input.flatMap((entry, index): ProductColor[] => {
    if (typeof entry === "string") {
      const hex = normalizeHex(entry);
      return hex ? [{ id: `legacy-${index}-${hex.slice(1).toLowerCase()}`, name: `Color ${index + 1}`, hex }] : [];
    }

    if (!entry || typeof entry !== "object") return [];
    const raw = entry as { id?: unknown; name?: unknown; hex?: unknown };
    const hex = normalizeHex(raw.hex);
    if (!hex) return [];
    const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `legacy-${index}-${hex.slice(1).toLowerCase()}`;
    const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : `Color ${index + 1}`;
    return [{ id, name, hex }];
  });
}
