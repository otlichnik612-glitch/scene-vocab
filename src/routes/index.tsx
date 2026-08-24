import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Clapperboard, FileText, Instagram, Layers, Loader2, Type } from "lucide-react";
import { OutputCard } from "@/components/output-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pickRandomFilm } from "@/lib/generator/films";
import { generatePosts, generateViaNetlify, isNetlifyHost } from "@/lib/generator/generate";
import type { AssembledPosts } from "@/lib/generator/format";

export const Route = createFileRoute("/")({ component: Home });

const EMPTY_POSTS: AssembledPosts = {
  instagram: "",
  title: "",
  description: "",
  publication: "",
};

const FILM_KEY = "scene-vocab-film";

type ResultId = "out-instagram" | "out-title" | "out-description" | "out-publication";

function humanizeError(caught: unknown): string {
  const raw = caught instanceof Error ? caught.message : String(caught ?? "");
  const lower = raw.toLowerCase();
  if (
    lower.includes("load failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("abort") ||
    lower.includes("timeout")
  ) {
    return "Сафари оборвал запрос. Оставьте экран включённым и нажмите кнопку ещё раз.";
  }
  return raw.trim() || "Не удалось сгенерировать текст.";
}

function Home() {
  const generate = useServerFn(generatePosts);
  const [film, setFilm] = useState("");
  const [posts, setPosts] = useState<AssembledPosts>(EMPTY_POSTS);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Введите название фильма и нажмите кнопку генерации.");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FILM_KEY);
      if (saved) setFilm(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      if (film) localStorage.setItem(FILM_KEY, film);
    } catch {
      /* ignore */
    }
  }, [film]);

  const runGenerate = async (nextFilm?: string, focusId: ResultId = "out-instagram") => {
    const title = (nextFilm ?? film).trim();
    if (!title) {
      setError("Сначала введите название фильма или сериала.");
      setStatus("Нужно название фильма.");
      document.getElementById("film-field")?.focus();
      return;
    }

    setBusy(true);
    setError(null);
    setStatus(`Генерация по «${title}». Обычно это занимает меньше минуты.`);

    try {
      const result = isNetlifyHost()
        ? await generateViaNetlify(title)
        : await generate({ data: { film: title } });
      if (!result.ok) {
        setError(result.error);
        setStatus("Генерация не удалась.");
        return;
      }
      setFilm(result.film);
      setPosts(result.posts);
      setStatus(`Готово: комплект по «${result.film}».`);
      window.requestAnimationFrame(() => {
        document.getElementById(focusId)?.focus();
      });
    } catch (caught) {
      const message = humanizeError(caught);
      setError(message);
      setStatus("Генерация не удалась.");
    } finally {
      setBusy(false);
    }
  };

  const onRandom = () => {
    const next = pickRandomFilm(film);
    setFilm(next);
    void runGenerate(next, "out-instagram");
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runGenerate(undefined, "out-instagram");
  };

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a href="#film-field" className="skip-link">
        К полю названия фильма
      </a>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-8 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
            Instagram + Lavatop
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
            Scene Vocab
          </h1>
          <p className="max-w-xl text-lg leading-snug text-muted">
            Введите фильм или сериал — получите связанный комплект: пост для Instagram, заголовок,
            описание и публикацию для Lavatop в вашем формате.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <div className="rounded-xl bg-bg-elevated p-4 shadow-[var(--shadow-border)] sm:p-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="film-field" className="text-lg">
                Название фильма
              </Label>
              <Input
                id="film-field"
                value={film}
                onChange={(event) => setFilm(event.target.value)}
                placeholder="Dirty Dancing"
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="go"
                disabled={busy}
                aria-required="true"
                aria-invalid={error && !film.trim() ? true : undefined}
              />
              <p className="text-sm text-muted">
                Английское название. Любая кнопка собирает все четыре текста сразу, чтобы они
                оставались про одно и то же кино.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                type="button"
                size="lg"
                variant="secondary"
                onClick={() => void runGenerate(undefined, "out-instagram")}
                disabled={busy}
              >
                <Instagram aria-hidden="true" />
                Instagram
              </Button>
              <Button
                type="button"
                size="lg"
                variant="secondary"
                onClick={() => void runGenerate(undefined, "out-title")}
                disabled={busy}
              >
                <Type aria-hidden="true" />
                Заголовок
              </Button>
              <Button
                type="button"
                size="lg"
                variant="secondary"
                onClick={() => void runGenerate(undefined, "out-description")}
                disabled={busy}
              >
                <FileText aria-hidden="true" />
                Описание
              </Button>
              <Button
                type="button"
                size="lg"
                variant="secondary"
                onClick={() => void runGenerate(undefined, "out-publication")}
                disabled={busy}
              >
                <Layers aria-hidden="true" />
                Публикация
              </Button>
            </div>

            <div className="mt-3">
              <Button type="submit" size="lg" disabled={busy} className="w-full">
                {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                {busy ? "Генерация…" : "Generate All"}
              </Button>
            </div>
          </div>

          <div
            className="min-h-7 text-base"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {busy ? (
              <p className="font-medium text-primary">{status}</p>
            ) : error ? (
              <p className="font-medium text-danger">{error}</p>
            ) : (
              <p className="text-muted">{status}</p>
            )}
          </div>

          <div className="flex flex-col gap-5" aria-busy={busy}>
            <OutputCard
              id="out-instagram"
              title="Instagram"
              hint="Готовый пост: 7 выражений, подвал и хэштеги."
              value={posts.instagram}
              onChange={(value) => setPosts((current) => ({ ...current, instagram: value }))}
              rows={18}
              busy={busy}
            />
            <OutputCard
              id="out-title"
              title="Заголовок"
              hint="Название публикации для Lavatop."
              value={posts.title}
              onChange={(value) => setPosts((current) => ({ ...current, title: value }))}
              rows={3}
              busy={busy}
            />
            <OutputCard
              id="out-description"
              title="Описание"
              hint="Описание публикации для Lavatop."
              value={posts.description}
              onChange={(value) => setPosts((current) => ({ ...current, description: value }))}
              rows={3}
              busy={busy}
            />
            <OutputCard
              id="out-publication"
              title="Публикация"
              hint="Продолжение для Lavatop: пункты 8–17 и клише с почтой."
              value={posts.publication}
              onChange={(value) => setPosts((current) => ({ ...current, publication: value }))}
              rows={20}
              busy={busy}
            />
          </div>

          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={onRandom}
            disabled={busy}
            className="w-full"
          >
            <Clapperboard aria-hidden="true" />
            Случайный фильм
          </Button>
        </form>
      </main>
    </div>
  );
}
