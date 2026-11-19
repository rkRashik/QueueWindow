"use client";

import {
  motion,
  useScroll,
  useSpring,
  type HTMLMotionProps,
} from "framer-motion";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 240, damping: 26 },
  },
} as const;

/** Staggered entrance for a group of `Item`s. */
export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function Item({
  as = "div",
  ...props
}: { as?: "div" | "h1" | "p" } & Omit<HTMLMotionProps<"div">, "variants">) {
  const Tag = motion[as] as typeof motion.div;
  return <Tag variants={item} {...props} />;
}

export function FeatureCard({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 24,
        delay: (index % 3) * 0.07,
      }}
    >
      {children}
    </motion.article>
  );
}

const links = [
  { href: "#product", label: "Product", className: "hidden sm:inline-flex" },
  { href: "/login", label: "Log in", className: "" },
];

/** Header nav with a hover pill that glides between links. */
export function LandingNav() {
  const pill = useId();
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <nav
      aria-label="Main navigation"
      className="flex flex-wrap items-center gap-1 sm:gap-2"
      onMouseLeave={() => setHovered(null)}
    >
      {links.map(({ href, label, className }) => {
        const props = {
          className: `btn btn-quiet relative hover:!bg-transparent ${className}`,
          onMouseEnter: () => setHovered(label),
          onFocus: () => setHovered(label),
          onBlur: () => setHovered(null),
        };
        const content = (
          <>
            {hovered === label && (
              <motion.span
                layoutId={pill}
                className="absolute inset-0 rounded-lg bg-slate-100"
                transition={{ type: "spring", stiffness: 500, damping: 36 }}
              />
            )}
            <span className="relative">{label}</span>
          </>
        );
        return href.startsWith("#") ? (
          <a key={label} href={href} {...props}>
            {content}
          </a>
        ) : (
          <Link key={label} href={href} {...props}>
            {content}
          </Link>
        );
      })}
      <Link className="btn btn-primary" href="/signup">
        Sign up
      </Link>
    </nav>
  );
}

/** Hairline reading-progress bar pinned under the sticky header. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28 });
  return (
    <motion.div
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-teal-600"
      style={{ scaleX }}
    />
  );
}
