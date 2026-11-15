import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">404</p>
      <h1 className="mt-3 text-3xl font-semibold">That board is not on the site.</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Comps get retired when a patch removes them. The current tier list always has what
        is actually playable.
      </p>
      <div className="mt-7 flex justify-center gap-3">
        <Link href="/meta" className="btn btn-primary">
          Current meta
        </Link>
        <Link href="/" className="btn btn-ghost">
          Home
        </Link>
      </div>
    </div>
  );
}
