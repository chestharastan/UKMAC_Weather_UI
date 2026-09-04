import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent)] text-white shadow-sm hover:bg-[var(--accent-strong)] focus-visible:outline-[var(--accent)] active:scale-[0.98]",
  secondary:
    "border border-[var(--line)] bg-white text-[var(--foreground)] shadow-xs hover:bg-white hover:border-[var(--line-strong)] focus-visible:outline-[var(--accent)] active:scale-[0.98]",
  ghost:
    "bg-transparent text-[var(--foreground)] hover:bg-black/[0.04] focus-visible:outline-[var(--accent)] active:scale-[0.98]",
  danger:
    "bg-[#d70015] text-white shadow-sm hover:bg-[#a80011] focus-visible:outline-[#d70015] active:scale-[0.98]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function Button({
  className,
  disabled,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-semibold tracking-[-0.01em] transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled}
      type={type}
      {...props}
    />
  );
}
