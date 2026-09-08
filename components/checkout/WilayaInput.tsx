"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { ALGERIA_WILAYAS } from "@/data/algeriaWilayas";

type WilayaInputProps = { name: string; invalid?: boolean; required?: boolean; onCanonicalChange?: (wilaya: string) => void };

export function normalizeWilayaSearch(value: string) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-DZ");
}

export function filterWilayas(value: string) {
  const query = normalizeWilayaSearch(value);
  return ALGERIA_WILAYAS.filter((wilaya) => !query || normalizeWilayaSearch(`${wilaya.label} ${wilaya.name}`).includes(query));
}

export function resolveCanonicalWilaya(value: string): string | null {
  const normalized = normalizeWilayaSearch(value);
  if (!normalized) return null;
  return ALGERIA_WILAYAS.find((wilaya) => normalizeWilayaSearch(wilaya.name) === normalized || normalizeWilayaSearch(wilaya.label) === normalized)?.name ?? null;
}

export function WilayaInput({ name, invalid = false, required = true, onCanonicalChange }: WilayaInputProps) {
  const inputId = useId();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [canonicalValue, setCanonicalValue] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const matches = useMemo(() => filterWilayas(query), [query]);

  function updateValue(value: string) {
    const canonical = resolveCanonicalWilaya(value) ?? "";
    setQuery(value); setCanonicalValue(canonical); onCanonicalChange?.(canonical);
  }
  function selectWilaya(value: string) { setQuery(value); setCanonicalValue(value); onCanonicalChange?.(value); setOpen(false); }
  function handleChange(event: ChangeEvent<HTMLInputElement>) { updateValue(event.target.value); setActiveIndex(0); setOpen(true); }
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { setOpen(false); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault(); setOpen(true);
      setActiveIndex((current) => Math.max(0, Math.min(matches.length - 1, current + (event.key === "ArrowDown" ? 1 : -1))));
    }
    if (event.key === "Enter" && open && matches[activeIndex]) { event.preventDefault(); selectWilaya(matches[activeIndex].name); }
  }

  return <div className="wilayaCombobox" ref={rootRef} onBlur={(event) => { if (!rootRef.current?.contains(event.relatedTarget as Node | null)) { const canonical = resolveCanonicalWilaya(query); if (canonical) setQuery(canonical); setOpen(false); } }}>
    <input id={inputId} role="combobox" type="text" value={query} onChange={handleChange} onKeyDown={handleKeyDown} onFocus={() => setOpen(true)} onClick={() => setOpen(true)}
      aria-autocomplete="list" aria-controls={listId} aria-expanded={open} aria-activedescendant={open && matches[activeIndex] ? `${listId}-${matches[activeIndex].code}` : undefined}
      data-wilaya-input={name} placeholder="Type or choose wilaya" autoComplete="address-level1" aria-invalid={invalid} required={required} />
    <input type="hidden" name={name} value={canonicalValue} data-wilaya-value />
    {open ? <div className="wilayaCombobox__list" id={listId} role="listbox" aria-label="Algeria wilayas">
      {matches.length ? matches.map((wilaya, index) => <button id={`${listId}-${wilaya.code}`} className={index === activeIndex ? "isActive" : undefined} type="button" role="option" aria-selected={wilaya.name === canonicalValue} onMouseDown={(event) => event.preventDefault()} onClick={() => selectWilaya(wilaya.name)} key={wilaya.code}><span>{wilaya.code}</span>{wilaya.name}</button>) : <p>No Wilaya found.</p>}
    </div> : null}
  </div>;
}
