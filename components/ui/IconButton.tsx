import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  badge?: string | number;
};

export function IconButton({ label, children, badge, className = "", ...props }: IconButtonProps) {
  return (
    <button type="button" className={`icon-button ${className}`.trim()} aria-label={label} {...props}>
      {children}
      {badge !== undefined ? <span className="icon-button-badge">{badge}</span> : null}
    </button>
  );
}
