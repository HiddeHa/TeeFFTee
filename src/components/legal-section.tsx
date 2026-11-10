import type { ReactNode } from "react";

export function LegalSection({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold">
        <span className="stat-value mr-2 text-muted">{n}.</span>
        {title}
      </h2>
      <div className="prose-block mt-2 text-sm">{children}</div>
    </section>
  );
}
