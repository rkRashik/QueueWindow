import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { DemoButton } from "@/features/landing/demo-button";
import { LiveBoard } from "@/features/landing/live-board";

export const metadata: Metadata = {
  title: "Service queues for desks, boards and phones",
  description: "Call from the desk. The waiting-room board and every visitor’s phone follow.",
};

const parts = [
  ["Desk", "One key calls the next person."],
  ["Board", "Readable from across the room."],
  ["Phone", "Scan, take a ticket, watch it move."],
] as const;

export default function Home() {
  return (
    <div className="landing">
      <header className="landing-head">
        <Wordmark />
        <nav aria-label="Account" className="flex items-center gap-1">
          <Link className="key key-quiet key-sm" href="/login">
            Log in
          </Link>
          <Link className="key key-sm" href="/signup">
            Create workspace
          </Link>
        </nav>
      </header>
      <main id="main">
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="landing-copy">
            <h1 id="hero-title" className="sign landing-title">
              One call.
              <br />
              Every screen.
            </h1>
            <p className="landing-lede">Call from the desk. The board and every phone follow.</p>
            <DemoButton />
            <p className="landing-note">A shared demo clinic. No sign-up.</p>
          </div>
          <LiveBoard />
        </section>
        <ul className="landing-parts" aria-label="What you get">
          {parts.map(([title, line]) => (
            <li key={title}>
              <h2 className="sign">{title}</h2>
              <p>{line}</p>
            </li>
          ))}
        </ul>
      </main>
      <footer className="landing-foot">
        <span className="muted text-sm">QueueWindow · English & বাংলা</span>
        <nav aria-label="Footer" className="flex gap-1">
          <Link className="key key-quiet key-sm" href="/login">
            Log in
          </Link>
          <Link className="key key-quiet key-sm" href="/signup">
            Create workspace
          </Link>
        </nav>
      </footer>
    </div>
  );
}
