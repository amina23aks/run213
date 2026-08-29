"use client";

import { useId, useState } from "react";
import type { ChangeEvent, FocusEvent } from "react";
import { ALGERIA_WILAYAS } from "@/data/algeriaWilayas";

type WilayaInputProps = {
  name: string;
  invalid?: boolean;
  onCanonicalChange?: (wilaya: string) => void;
};

function normalizeWilaya(value: string) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-DZ");
}

export function resolveCanonicalWilaya(value: string): string | null {
  const normalized = normalizeWilaya(value);
  if (!normalized) return null;
  return ALGERIA_WILAYAS.find((wilaya) => normalizeWilaya(wilaya.name) === normalized || normalizeWilaya(wilaya.label) === normalized)?.name ?? null;
}

export function WilayaInput({ name, invalid = false, onCanonicalChange }: WilayaInputProps) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [canonicalValue, setCanonicalValue] = useState("");

  function updateValue(value: string) {
    const canonical = resolveCanonicalWilaya(value) ?? "";
    setQuery(value);
    setCanonicalValue(canonical);
    onCanonicalChange?.(canonical);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    updateValue(event.target.value);
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const canonical = resolveCanonicalWilaya(event.target.value);
    if (canonical) setQuery(canonical);
  }

  return (
    <>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onBlur={handleBlur}
        list={listId}
        data-wilaya-input={name}
        placeholder="Type or choose wilaya"
        autoComplete="address-level1"
        aria-invalid={invalid}
        required
      />
      <input type="hidden" name={name} value={canonicalValue} data-wilaya-value />
      <datalist id={listId}>
        {ALGERIA_WILAYAS.map((wilaya) => <option value={wilaya.name} label={wilaya.label} key={wilaya.code} />)}
      </datalist>
    </>
  );
}
