import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { AnchorHTMLAttributes } from "react";

type ArrowButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  label: string;
};

export function ArrowButton({ href, label, className = "", ...props }: ArrowButtonProps) {
  return (
    <Link href={href} className={`arrow-button ${className}`.trim()} {...props}>
      <span>{label}</span>
      <ArrowUpRight aria-hidden="true" size={18} strokeWidth={2.5} />
    </Link>
  );
}
