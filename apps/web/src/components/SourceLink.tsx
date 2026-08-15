import type { ReactNode } from "react";

/**
 * Canonical external source link (DESIGN.md 15). Always carries an explicit
 * label and an external-link cue so it reads apart from internal navigation.
 */
export function SourceLink({
  href,
  children = "View source",
  className = "",
  title,
}: {
  href: string;
  children?: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={title}
      className={`focus-ring inline-flex items-center gap-1 text-accent underline decoration-accent/35 underline-offset-[3px] transition-colors hover:decoration-accent ${className}`}
    >
      {children}
      <span aria-hidden="true">↗</span>
    </a>
  );
}
