import { assemblePosts, type AssembledPosts, type GeneratedPayload, type VocabItem } from "./format";
import { SYSTEM_PROMPT, userPrompt } from "./prompt";
import { z } from "zod";

const VocabItemSchema = z.object({
  lemma: z.string().min(1),
  definition: z.string().min(1),
  example: z.string().min(1),
});

const PayloadSchema = z.object({
  title: z.string().min(1),
  emoji: z.string().min(1),
  descriptionEmoji: z.string().min(1),
  filmHashtags: z.union([z.string(), z.array(z.string())]).optional(),
  instagramItems: z.array(VocabItemSchema).min(7),
  lavatopItems: z.array(VocabItemSchema).min(10),
});

export type GenerateResult =
  | { ok: true; film: string; posts: AssembledPosts }
  | { ok: false; error: string };

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Модель вернула ответ без JSON");
  }
  return JSON.parse(raw.slice(start, end + 1)) as unknown;
}

function toHashtagString(value: string | string[] | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value
      .map((tag) => tag.replace(/^#/, "").trim())
      .filter(Boolean)
      .map((tag) => `#${tag}`)
      .join("");
  }
  return value;
}

function isParseError(error: unknown): boolean {
  if (error instanceof z.ZodError) return true;
  if (error instanceof SyntaxError) return true;
  const message = error instanceof Error ? error.message : String(error);
  return /json|zod|incomplete|expected/i.test(message);
}

async function chat(messages: { role: "system" | "user"; content: string }[], apiKey: string) {
  let res: Response;
  try {
    res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0.7,
        max_tokens: 5000,
        response_format: { type: "json_object" },
        messages,
      }),
      signal: AbortSignal.timeout(70_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/timeout|abort/i.test(message)) {
      throw new Error("Генерация заняла слишком много времени. Нажмите кнопку ещё раз.");
    }
    throw new Error("Сеть оборвала запрос к модели. Нажмите кнопку ещё раз.");
  }

  if (!res.ok) {
    throw new Error("Сервис генерации сейчас не отвечает. Подождите минуту и нажмите ещё раз.");
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("Пустой ответ модели");
  return content;
}

function asPayload(raw: unknown): GeneratedPayload {
  const parsed = PayloadSchema.parse(raw);
  const instagramItems: VocabItem[] = parsed.instagramItems.slice(0, 7);
  const lavatopItems: VocabItem[] = parsed.lavatopItems.slice(0, 10);
  return {
    title: parsed.title.trim(),
    emoji: parsed.emoji.trim(),
    descriptionEmoji: parsed.descriptionEmoji.trim(),
    filmHashtags: toHashtagString(parsed.filmHashtags),
    instagramItems,
    lavatopItems,
  };
}

async function generateOnce(film: string, apiKey: string): Promise<GeneratedPayload> {
  const content = await chat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt(film) },
    ],
    apiKey,
  );
  return asPayload(extractJson(content));
}

async function repairOnce(film: string, previous: string, apiKey: string): Promise<GeneratedPayload> {
  const content = await chat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt(film) },
      {
        role: "user",
        content: `The previous JSON was invalid or incomplete. Fix it so instagramItems has exactly 7 objects and lavatopItems has exactly 10 objects, all with lemma/definition/example strings. Previous output:\n${previous.slice(0, 4000)}`,
      },
    ],
    apiKey,
  );
  return asPayload(extractJson(content));
}

export async function generateFilmPosts(film: string): Promise<GenerateResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Генерация сейчас недоступна. Попробуйте позже." };
  }

  try {
    const payload = await generateOnce(film, apiKey);
    return {
      ok: true,
      film: payload.title || film,
      posts: assemblePosts(payload),
    };
  } catch (firstError) {
    if (!isParseError(firstError)) {
      const message =
        firstError instanceof Error ? firstError.message : "Не удалось сгенерировать текст";
      return { ok: false, error: message };
    }
    try {
      const payload = await repairOnce(
        film,
        firstError instanceof Error ? firstError.message : "invalid json",
        apiKey,
      );
      return {
        ok: true,
        film: payload.title || film,
        posts: assemblePosts(payload),
      };
    } catch (secondError) {
      const message =
        secondError instanceof Error ? secondError.message : "Не удалось сгенерировать текст";
      return { ok: false, error: message };
    }
  }
}
