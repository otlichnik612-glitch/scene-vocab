import { createServerFn } from "@tanstack/react-start";
import { generateFilmPosts, type GenerateResult } from "./generate.server";
import type { AssembledPosts } from "./format";

export const generatePosts = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (typeof input !== "object" || input === null || !("film" in input)) {
      throw new Error("Введите название фильма или сериала");
    }
    const film = String((input as { film: unknown }).film ?? "").trim();
    if (!film) {
      throw new Error("Введите название фильма или сериала");
    }
    if (film.length > 160) {
      throw new Error("Название слишком длинное");
    }
    return { film };
  })
  .handler(async ({ data }): Promise<GenerateResult> => {
    return generateFilmPosts(data.film);
  });

export function isNetlifyHost() {
  if (typeof window === "undefined") return false;
  return /\.netlify\.(app|com)$/i.test(window.location.hostname);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateViaNetlify(film: string): Promise<GenerateResult> {
  const jobId = crypto.randomUUID();
  const start = await fetch("/.netlify/functions/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ film, jobId }),
    signal: AbortSignal.timeout(20_000),
  });

  if (start.status !== 202 && !start.ok) {
    throw new Error("Сервис генерации сейчас не отвечает. Подождите минуту и нажмите ещё раз.");
  }

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await sleep(2000);
    const poll = await fetch(`/.netlify/functions/job?id=${encodeURIComponent(jobId)}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!poll.ok) continue;
    const data = (await poll.json()) as {
      status?: string;
      film?: string;
      posts?: AssembledPosts;
      error?: string;
    };
    if (data.status === "done" && data.posts) {
      return { ok: true, film: data.film || film, posts: data.posts };
    }
    if (data.status === "error") {
      return { ok: false, error: data.error || "Не удалось сгенерировать текст" };
    }
  }

  return { ok: false, error: "Генерация заняла слишком много времени. Нажмите кнопку ещё раз." };
}
