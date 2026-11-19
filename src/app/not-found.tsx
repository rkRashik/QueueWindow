import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-lg px-6 py-20">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <Link
        href="/"
        className="mt-5 inline-block text-brand underline underline-offset-4"
      >
        Return to QueueWindow
      </Link>
    </main>
  );
}
