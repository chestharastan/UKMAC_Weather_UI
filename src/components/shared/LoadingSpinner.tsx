type LoadingSpinnerProps = {
  label?: string;
};

export function LoadingSpinner({ label = "Loading" }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center gap-3 text-sm font-medium text-[var(--muted)]">
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]"
      />
      <span>{label}</span>
    </div>
  );
}
