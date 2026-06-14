import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-coffee-dark flex items-center justify-center px-6 py-12 text-center text-coffee-text">
      <div className="glass-card max-w-xl p-10 border border-coffee-border">
        <p className="text-sm uppercase tracking-[0.4em] text-coffee-muted">Page not found</p>
        <h1 className="mt-6 text-4xl font-semibold text-coffee-text">Lost in the brew?</h1>
        <p className="mt-4 text-sm text-coffee-muted">The path you’re looking for doesn’t exist yet. Return to the dashboard to continue building campaigns.</p>
        <Link href="/" className="mt-8 inline-flex rounded-full bg-coffee-highlight px-6 py-3 text-sm font-semibold text-coffee-cream transition hover:opacity-90">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
