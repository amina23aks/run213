import Image from "next/image";
import type { ApprovedCommunityEntry } from "@/constants/run-club";

type ApprovedCommunityMarqueeProps = {
  entries: ApprovedCommunityEntry[];
};

export function ApprovedCommunityMarquee({ entries }: ApprovedCommunityMarqueeProps) {
  const marqueeEntries = [...entries, ...entries];

  return (
    <div className="community-marquee" aria-label="Approved 213 RUN Club community entries">
      <div className="community-marquee__track">
        {marqueeEntries.map((entry, index) => (
          <article className="community-card" key={`${entry.id}-${index}`} aria-hidden={index >= entries.length ? "true" : undefined}>
            <Image src={entry.image} alt={`${entry.name} approved run proof`} width={360} height={260} />
            <div>
              <strong>{entry.name}</strong>
              <span>{entry.location} · {entry.distance}</span>
            </div>
            <p>{entry.note}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
