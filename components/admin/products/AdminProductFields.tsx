import type { ReactNode } from "react";

type AdminProductFieldProps = {
  label: string;
  helper?: string;
  children: ReactNode;
};

export function AdminProductField({ label, helper, children }: AdminProductFieldProps) {
  return (
    <label className="adminProductField">
      <span>{label}</span>
      {children}
      {helper ? <small>{helper}</small> : null}
    </label>
  );
}

export function AdminProductSection({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="adminProductSection">
      <div className="adminProductSection__header">
        <p>{eyebrow}</p>
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  );
}
