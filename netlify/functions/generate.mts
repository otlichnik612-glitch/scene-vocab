import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { generateFilmPosts } from "../../src/lib/generator/generate.server";

const JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async (req: Request) => {
  let body: { film?: unknown; jobId?: unknown } = {};
  try {
    body = (await req.json()) as { film?: unknown; jobId?: unknown };
  } catch {
    return;
  }

  const jobId = String(body.jobId ?? "");
  const film = String(body.film ?? "").trim();
  if (!JOB_ID.test(jobId) || !film || film.length > 160) return;

  const store = getStore("jobs");
  await store.setJSON(jobId, { status: "running" });

  try {
    const result = await generateFilmPosts(film);
    if (result.ok) {
      await store.setJSON(jobId, {
        status: "done",
        film: result.film,
        posts: result.posts,
      });
      return;
    }
    await store.setJSON(jobId, { status: "error", error: result.error });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось сгенерировать текст";
    await store.setJSON(jobId, { status: "error", error: message });
  }
};

export const config: Config = { background: true };
