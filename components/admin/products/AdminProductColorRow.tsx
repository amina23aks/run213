"use client";

import { useState } from "react";
import { AdminProductField } from "@/components/admin/products/AdminProductFields";
import type { ProductDraftColor } from "@/components/admin/products/types";
import { normalizeProductColor, productColorToRgb, rgbChannelsToProductColor } from "@/lib/products/color";

type Props = { color: ProductDraftColor; onChange: (patch: Partial<Omit<ProductDraftColor, "id">>) => void; onRemove: () => void };

export function AdminProductColorRow({ color, onChange, onRemove }: Props) {
  const canonical = normalizeProductColor(color.hex) ?? "#000000";
  const canonicalRgb = productColorToRgb(canonical) ?? [0, 0, 0];
  const [hexDraft, setHexDraft] = useState(canonical);
  const [rgbDraft, setRgbDraft] = useState(() => canonicalRgb.map(String) as [string, string, string]);
  const [error, setError] = useState<string | null>(null);
  const [lastCanonical, setLastCanonical] = useState(canonical);

  if (canonical !== lastCanonical) {
    setLastCanonical(canonical); setHexDraft(canonical); setRgbDraft(canonicalRgb.map(String) as [string, string, string]); setError(null);
  }

  function applyCanonical(next: string) { const normalized = normalizeProductColor(next); if (!normalized) { setError("Use #RRGGBB."); return; } const rgb = productColorToRgb(normalized); setLastCanonical(normalized); setHexDraft(normalized); if (rgb) setRgbDraft(rgb.map(String) as [string, string, string]); setError(null); onChange({ hex: normalized }); }
  function updateRgb(index: number, value: string) {
    const next = [...rgbDraft] as [string, string, string]; next[index] = value.replace(/\D/g, "").slice(0, 3); setRgbDraft(next);
    const normalized = rgbChannelsToProductColor(...next);
    if (!normalized) { setError("RGB values must be 0–255."); return; }
    setLastCanonical(normalized); setHexDraft(normalized); setError(null); onChange({ hex: normalized });
  }

  return <div className="adminColorRow">
    <label className="adminColorPicker"><input type="color" value={canonical} aria-label={`Choose ${color.name || "product"} color`} onChange={(event) => applyCanonical(event.target.value)} /><span style={{ backgroundColor: canonical }} /></label>
    <AdminProductField label="Name"><input placeholder="Black" value={color.name} onChange={(event) => onChange({ name: event.target.value })} /></AdminProductField>
    <AdminProductField label="Hex"><input placeholder="#111111" value={hexDraft} aria-invalid={Boolean(error)} onChange={(event) => { setHexDraft(event.target.value); const normalized = normalizeProductColor(event.target.value); if (normalized) applyCanonical(normalized); }} onBlur={() => applyCanonical(hexDraft)} /></AdminProductField>
    <div className="adminMobileRgb" aria-label="RGB color values"><span>RGB</span><div>{(["R", "G", "B"] as const).map((label, index) => <label key={label}><small>{label}</small><input inputMode="numeric" value={rgbDraft[index]} aria-label={`${label} value`} aria-invalid={Boolean(error)} onChange={(event) => updateRgb(index, event.target.value)} /></label>)}</div>{error ? <small className="adminColorError" role="alert">{error}</small> : null}</div>
    <button type="button" onClick={onRemove}>Remove</button>
  </div>;
}
