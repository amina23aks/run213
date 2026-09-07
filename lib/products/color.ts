export function normalizeProductColor(value: string): string | null {
  const compact = value.trim();
  const hex = compact.match(/^#?([0-9a-f]{6})$/i);
  if (hex) return `#${hex[1].toUpperCase()}`;
  const rgb = compact.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!rgb) return null;
  const channels = rgb.slice(1).map(Number);
  if (channels.some((channel) => channel > 255)) return null;
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}
