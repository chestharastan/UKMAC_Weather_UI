import type { ReactNode } from "react";

import { PageHeader } from "@/components/shared/PageHeader";

type PageShellProps = {
  actions?: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
  description?: string;
  title: string;
};

export function PageShell({ actions, banner, children, description, title }: PageShellProps) {
  return (
    <section className="space-y-6">
      <PageHeader actions={actions} description={description} title={title} />
      {banner}
      {children}
    </section>
  );
}
