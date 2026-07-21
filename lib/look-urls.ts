import type { Look } from "@/types/look";

export function getLookHref(look: Pick<Look, "slug">): string {
  return `/look/${look.slug}`;
}
