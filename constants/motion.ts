export const motion = {
  snap: { duration: 0.08, ease: "easeOut" },
  micro: { duration: 0.15, ease: "easeOut" },
  standard: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  cinematic: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  stagger: 0.08,
} as const;
