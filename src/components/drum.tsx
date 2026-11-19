"use client";

import { useEffect, useState, type CSSProperties } from "react";

/**
 * A split-flap style drum: when the value changes, only the characters that
 * differ roll (200 ms, staggered 28 ms). The first render never animates.
 */
export function Drum({ value, className = "" }: { value: string; className?: string }) {
  const [shown, setShown] = useState(value);
  const [previous, setPrevious] = useState<string | null>(null);
  const [turn, setTurn] = useState(0);
  if (value !== shown) {
    setPrevious(shown);
    setShown(value);
    setTurn(turn + 1);
  }
  useEffect(() => {
    if (previous === null) return;
    const settle = setTimeout(() => setPrevious(null), 420);
    return () => clearTimeout(settle);
  }, [previous, turn]);

  return (
    <span className={`drum ${className}`} translate="no">
      <span className="sr-only">{shown}</span>
      <span aria-hidden="true" className="contents">
        {Array.from(shown).map((char, index) => {
          const old = previous?.[index];
          const changed = previous !== null && old !== char;
          return (
            <span
              key={index}
              className="drum-cell"
              style={{ "--i": index } as CSSProperties}
            >
              <span key={changed ? turn : "still"} data-drum={changed ? "in" : undefined}>
                {char}
              </span>
              {changed && old !== undefined && <span data-drum="out">{old}</span>}
            </span>
          );
        })}
      </span>
    </span>
  );
}
