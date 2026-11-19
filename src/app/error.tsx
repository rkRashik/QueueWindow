"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="access-body min-h-dvh">
      <h1 className="sign text-4xl font-bold">Something went wrong</h1>
      <p className="muted mt-2">The page couldn’t load. Your queue data is safe.</p>
      <div className="mt-6">
        <button type="button" className="key key-primary" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
