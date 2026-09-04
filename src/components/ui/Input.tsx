import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  label?: string;
};

export function Input({ className, error, id, label, name, onWheel, type, ...props }: InputProps) {
  const inputId = id ?? (typeof name === "string" ? name : undefined);

  return (
    <div className="space-y-2">
      {label ? (
        <label className="text-sm font-medium tracking-[-0.01em]" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input
        aria-describedby={error && inputId ? `${inputId}-error` : undefined}
        aria-invalid={Boolean(error)}
        className={cn(
          "h-11 w-full rounded-md border border-[var(--line)] bg-[#fbfbfc] px-3 text-sm text-[var(--foreground)] outline-none transition-all duration-150 placeholder:text-[#9aa6a1] focus:border-[var(--accent)] focus:bg-white focus:ring-4 focus:ring-[var(--accent-soft)]",
          error && "border-[#d70015] focus:border-[#d70015] focus:ring-[#ffd7d9]",
          className,
        )}
        id={inputId}
        name={name}
        onWheel={(event) => {
          if (type === "number") {
            event.currentTarget.blur();
          }
          onWheel?.(event);
        }}
        type={type}
        {...props}
      />
      {error ? (
        <p className="text-sm text-[#d70015]" id={inputId ? `${inputId}-error` : undefined}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
