import type { BlogPostCodeBlock, BlogPostSource } from "@lkmlens/shared";
import type { ReactNode } from "react";
import { SourceLink } from "./SourceLink.tsx";

const CODE_TOKEN = /(\/\/.*|"(?:\\.|[^"\\])*"|\b(?:as|close|const|fn|for|if|impl|int|ioctl|let|mut|open|pub|return|self|sizeof|struct|unsafe)\b|\bFWCTL_[A-Z_]+\b)/gu;
const KEYWORD = /^(?:as|close|const|fn|for|if|impl|int|ioctl|let|mut|open|pub|return|self|sizeof|struct|unsafe)$/u;

function highlightedLine(line: string): ReactNode[] {
  return line.split(CODE_TOKEN).filter(Boolean).map((token, index) => {
    if (token.startsWith("//")) {
      return <span key={index} className="text-ink-muted italic">{token}</span>;
    }
    if (KEYWORD.test(token)) {
      return <span key={index} className="font-medium text-accent">{token}</span>;
    }
    if (token.startsWith("FWCTL_")) {
      return <span key={index} className="font-medium text-ink">{token}</span>;
    }
    return <span key={index}>{token}</span>;
  });
}

export function EvidenceCodeBlock({
  block,
  sources,
}: {
  block: BlogPostCodeBlock;
  sources: Map<string, BlogPostSource>;
}) {
  const lines = block.code.replace(/\n$/u, "").split("\n");
  const language = block.language.toUpperCase();
  const resolvedSources = block.sources.flatMap((reference) => {
    const source = sources.get(reference.sourceId);
    return source ? [{ ...reference, source }] : [];
  });

  return (
    <figure className="overflow-hidden rounded-lg border border-border-strong bg-surface">
      <div className="flex min-h-10 items-stretch justify-between gap-4 border-b border-border bg-surface">
        <span className="flex items-center border-b-2 border-accent px-3.5 font-mono text-meta font-semibold text-accent sm:px-4">
          {language}
        </span>
        <span className="flex items-center px-3.5 text-right text-meta text-ink-muted sm:px-4">
          Simplified for explanation
        </span>
      </div>

      <figcaption className="border-b border-border px-3.5 py-2.5 text-small font-medium text-ink sm:px-4">
        {block.caption}
      </figcaption>

      <pre
        tabIndex={0}
        aria-label={`${language} code example: ${block.caption}`}
        className="focus-ring overflow-x-auto bg-surface-subtle py-3.5 font-mono text-[0.8125rem] leading-6 text-ink-secondary sm:py-4 sm:text-[0.84375rem]"
      >
        <code className="block min-w-max">
          {lines.map((line, index) => (
            <span key={index} className="grid grid-cols-[2.75rem_minmax(max-content,1fr)] sm:grid-cols-[3rem_minmax(max-content,1fr)]">
              <span aria-hidden="true" className="select-none border-r border-border pr-3 text-right text-ink-faint">
                {index + 1}
              </span>
              <span className="px-3.5 sm:px-4">{highlightedLine(line)}{"\n"}</span>
            </span>
          ))}
        </code>
      </pre>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-border px-3.5 py-2.5 text-meta text-ink-muted sm:px-4">
        <span>{resolvedSources.length === 1 ? "Source:" : "Sources:"}</span>
        {resolvedSources.map(({ sourceId, label, source }, index) => (
          <span key={sourceId} className="inline-flex items-baseline gap-2">
            {index > 0 && <span aria-hidden="true" className="text-ink-faint">·</span>}
            <SourceLink href={source.sourceUrl} title={source.subject}>{label}</SourceLink>
          </span>
        ))}
      </div>
    </figure>
  );
}
