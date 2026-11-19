"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-lg px-6 py-20">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <button
        type="button"
        className="mt-5 min-h-11 rounded-md bg-brand px-4 font-semibold text-white"
        onClick={reset}
      >
        Try again
      </button>
    </main>
  );
}
