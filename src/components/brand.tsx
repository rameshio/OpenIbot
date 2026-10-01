import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("h-8 w-8", className)}
    >
      <path
        d="M9 7.5 20 3l6 9-5 16-12-5L5 13l4-5.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m9 7.5 12 4.5-12 11m12-11-1-9M5 13l16-1 0 16m-12-5 17-11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProviderMark({
  model,
  className,
}: {
  model: string;
  className?: string;
}) {
  const key = model.toLowerCase();
  const color = key.includes("claude")
    ? "text-[#d49a82]"
    : key.includes("gemini")
      ? "text-[#9faff6]"
      : key.includes("gpt")
        ? "text-[#95b5a7]"
        : "text-[#b6b6bf]";
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center text-sm",
        color,
        className,
      )}
      aria-hidden="true"
    >
      {key.includes("claude")
        ? "✳"
        : key.includes("gemini")
          ? "✦"
          : key.includes("gpt")
            ? "◎"
            : key.includes("grok")
              ? "𝕏"
              : key.includes("local")
                ? "▧"
                : "✧"}
    </span>
  );
}
