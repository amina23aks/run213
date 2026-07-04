type SectionLabelProps = {
  eyebrow: string;
  title: string;
  copy?: string;
};

export function SectionLabel({ eyebrow, title, copy }: SectionLabelProps) {
  return (
    <div className="section-label">
      <p className="section-label-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {copy ? <p className="section-label-copy">{copy}</p> : null}
    </div>
  );
}
