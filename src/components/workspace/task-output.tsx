"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";

function inline(text: string): ReactNode[] {
  return text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code
          key={index}
          className="rounded bg-[#1c2027] px-1.5 py-0.5 font-mono text-[.9em] text-[#e3dac5]"
        >
          {part.slice(1, -1)}
        </code>
      );
    if (part.startsWith("**") && part.endsWith("**"))
      return (
        <strong key={index} className="font-medium text-[#f2f3f5]">
          {part.slice(2, -2)}
        </strong>
      );
    return part;
  });
}

/** Text-only Markdown rendering: generated content never becomes HTML or executable code. */
export function TaskOutput({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let cursor = 0;
  while (cursor < lines.length) {
    const line = lines[cursor];
    const key = cursor;
    if (!line.trim()) {
      cursor++;
      continue;
    }
    if (line.trimStart().startsWith("```")) {
      const language = line.trim().slice(3).trim();
      const code: string[] = [];
      cursor++;
      while (
        cursor < lines.length &&
        !lines[cursor].trimStart().startsWith("```")
      )
        code.push(lines[cursor++]);
      if (cursor < lines.length) cursor++;
      const content = code.join("\n");
      blocks.push(
        <div
          key={key}
          className="my-5 min-w-0 overflow-hidden rounded-xl border border-[#2b3039] bg-[#101318]"
        >
          <div className="flex items-center justify-between border-b border-[#252a33] px-4 py-2.5 text-[11px] text-[#9ca3af]">
            <span className="truncate font-mono">{language || "Code"}</span>
            <button
              type="button"
              className="flex items-center gap-1.5 hover:text-white"
              aria-label="Copy code"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(content);
                  toast("Code copied");
                } catch {
                  toast.error("Clipboard unavailable in this browser");
                }
              }}
            >
              <Copy size={12} />
              Copy
            </button>
          </div>
          <pre className="max-h-[540px] overflow-auto p-4 font-mono text-[12px] leading-6 text-[#d4d8df]">
            <code>{content}</code>
          </pre>
        </div>,
      );
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push(
        <div
          key={key}
          role="heading"
          aria-level={Math.min(heading[1].length + 1, 6)}
          className="mt-6 mb-3 text-[15px] font-medium leading-6 text-[#f2f3f5]"
        >
          {inline(heading[2])}
        </div>,
      );
      cursor++;
      continue;
    }
    const ordered = /^\s*\d+[.)]\s+/.test(line);
    const unordered = /^\s*[-*+]\s+/.test(line);
    if (ordered || unordered) {
      const pattern = ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*+]\s+/;
      const items: ReactNode[] = [];
      const start = ordered ? Number.parseInt(line.trim(), 10) : undefined;
      while (cursor < lines.length && pattern.test(lines[cursor])) {
        items.push(
          <li key={cursor} className="pl-1.5">
            {inline(lines[cursor].replace(pattern, ""))}
          </li>,
        );
        cursor++;
      }
      blocks.push(
        ordered ? (
          <ol
            key={key}
            start={start}
            className="my-3 ml-5 list-decimal space-y-2 marker:text-[#a0a6b2]"
          >
            {items}
          </ol>
        ) : (
          <ul
            key={key}
            className="my-3 ml-5 list-disc space-y-2 marker:text-[#a0a6b2]"
          >
            {items}
          </ul>
        ),
      );
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (cursor < lines.length && /^>\s?/.test(lines[cursor]))
        quote.push(lines[cursor++].replace(/^>\s?/, ""));
      blocks.push(
        <blockquote
          key={key}
          className="my-4 border-l-2 border-[#6e6045] pl-4 text-[#aeb4be]"
        >
          {inline(quote.join("\n"))}
        </blockquote>,
      );
      continue;
    }
    const paragraph = [line];
    cursor++;
    while (
      cursor < lines.length &&
      lines[cursor].trim() &&
      !/^(?:\s*```|#{1,6}\s|\s*[-*+]\s|\s*\d+[.)]\s|>)/.test(lines[cursor])
    )
      paragraph.push(lines[cursor++]);
    blocks.push(
      <p key={key} className="my-3 whitespace-pre-wrap">
        {inline(paragraph.join("\n"))}
      </p>,
    );
  }
  return (
    <div className="task-output min-w-0 text-[14px] leading-7 text-[#c9ced7] [overflow-wrap:anywhere] [&>:first-child]:mt-0 [&>:last-child]:mb-0">
      {blocks}
    </div>
  );
}
