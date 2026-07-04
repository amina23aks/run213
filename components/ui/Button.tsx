import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type SharedButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

type NativeButtonProps = SharedButtonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type LinkButtonProps = SharedButtonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

export type ButtonProps = NativeButtonProps | LinkButtonProps;

const variantClassNames: Record<ButtonVariant, string> = {
  primary: "btn btn-primary",
  secondary: "btn btn-secondary",
  ghost: "btn btn-ghost",
};

const sizeClassNames: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
};

export function Button(props: ButtonProps) {
  if ("href" in props && props.href) {
    const {
      children,
      href,
      variant = "primary",
      size = "md",
      className = "",
      ...anchorProps
    } = props;
    const classNames = `${variantClassNames[variant]} ${sizeClassNames[size]} ${className}`.trim();

    return (
      <Link href={href} className={classNames} {...anchorProps}>
        {children}
      </Link>
    );
  }

  const {
    children,
    variant = "primary",
    size = "md",
    className = "",
    type = "button",
    ...buttonProps
  } = props as NativeButtonProps;
  const classNames = `${variantClassNames[variant]} ${sizeClassNames[size]} ${className}`.trim();

  return (
    <button type={type} className={classNames} {...buttonProps}>
      {children}
    </button>
  );
}
