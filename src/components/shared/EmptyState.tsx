import type { ReactNode } from "react";

type EmptyStateProps = {
  action?: ReactNode;
  description?: string;
  title: string;
};

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--line-strong)] bg-white p-8 text-center shadow-xs">
      <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
