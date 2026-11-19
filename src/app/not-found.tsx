import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="access-body min-h-dvh">
      <h1 className="sign text-4xl font-bold">Page not found</h1>
      <p className="muted mt-2">This queue, ticket or page doesn’t exist.</p>
      <div className="mt-6">
        <Link className="key" href="/">
          Go to QueueWindow
        </Link>
      </div>
    </main>
  );
}
