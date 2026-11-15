import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getGuide, guides } from "@/content/guides";
import { formatDate } from "@/lib/format";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "Guide not found" };

  return {
    title: guide.title,
    description: guide.dek,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      title: guide.title,
      description: guide.dek,
      url: `/guides/${guide.slug}`,
    },
  };
}

export default async function GuidePage({ params }: { params: Params }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const others = guides.filter((entry) => entry.slug !== guide.slug);
  const sources = guide.sources ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <nav className="pt-6 text-xs text-muted">
        <Link href="/guides" className="hover:text-accent">
          Guides
        </Link>
        <span className="px-2">/</span>
        <span className="text-fg/70">{guide.title}</span>
      </nav>

      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Guide · set {guide.setNumber}
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{guide.title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">{guide.dek}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="chip">Patch {guide.patch}</span>
          <span className="chip">{guide.readingMinutes} min read</span>
          <span className="chip">Reviewed {formatDate(guide.updatedAt)}</span>
        </div>
      </header>

      {/* The guide standard's measured-versus-judgement rule, made visible rather
          than left as an author's intention (docs/guide-standard.md §4). */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-accent">
            Measured
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-fg/80">{guide.measured}</p>
        </div>
        <div className="card p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Judgement
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-fg/80">{guide.judgement}</p>
        </div>
      </section>

      {guide.sections.map((section) => (
        <section key={section.id} id={section.id} className="mt-10">
          <h2 className="text-xl font-semibold">{section.heading}</h2>
          <div className="prose-block mt-3 text-sm">
            {section.blocks.map((block, index) =>
              block.kind === "paragraph" ? (
                <p key={index}>{block.text}</p>
              ) : (
                <ul key={index} className="mt-3 space-y-2">
                  {block.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span
                        aria-hidden
                        className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ),
            )}
          </div>
        </section>
      ))}

      <section className="mt-10 rounded-xl border border-bad/30 bg-bad/5 p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-bad">
          Where this guide is wrong
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fg/80">{guide.counterCase}</p>
      </section>

      {sources.length > 0 ? (
        <p className="mt-6 text-xs leading-relaxed text-muted">
          Game mechanics checked against{" "}
          {sources.map((source, index) => (
            <span key={source.href}>
              {index > 0 ? (index === sources.length - 1 ? " and " : ", ") : ""}
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {source.label}
              </a>
            </span>
          ))}
          . The conclusions are this site&apos;s own.
        </p>
      ) : null}

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          More guides
        </h2>
        <ul className="mt-3 space-y-2">
          {others.map((entry) => (
            <li key={entry.slug}>
              <Link
                href={`/guides/${entry.slug}`}
                className="card block p-4 text-sm font-medium transition-colors hover:border-accent/40 hover:text-accent"
              >
                {entry.title}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          Back to{" "}
          <Link href="/guides" className="font-semibold text-accent hover:underline">
            all guides
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
