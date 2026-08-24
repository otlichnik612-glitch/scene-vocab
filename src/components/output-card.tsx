import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type OutputCardProps = {
  id: string;
  title: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  busy: boolean;
};

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
  }
}

export function OutputCard({ id, title, hint, value, onChange, rows, busy }: OutputCardProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    if (!value.trim()) return;
    await copyToClipboard(value);
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;

  return (
    <section
      aria-labelledby={labelId}
      className="rounded-xl bg-bg-elevated p-4 shadow-[var(--shadow-border)] sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id={labelId} className="font-display text-xl font-semibold tracking-tight text-fg">
            {title}
          </h2>
          <p id={hintId} className="mt-1 text-sm text-muted">
            {hint}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void copy()}
          disabled={!value.trim() || busy}
          aria-label={copied ? `${title}: скопировано` : `Copy: ${title}`}
        >
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? "Скопировано" : "Copy"}
        </Button>
      </div>
      <Textarea
        id={id}
        lang="en"
        spellCheck={false}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        placeholder={busy ? "Идёт генерация…" : "Текст появится здесь."}
        className={cn(
          "min-h-40 resize-y font-sans text-lg leading-relaxed",
          rows >= 16 && "min-h-80",
        )}
      />
    </section>
  );
}
