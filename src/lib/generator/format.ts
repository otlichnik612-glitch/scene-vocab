export type VocabItem = {
  lemma: string;
  definition: string;
  example: string;
};

export type GeneratedPayload = {
  title: string;
  emoji: string;
  descriptionEmoji: string;
  filmHashtags: string;
  instagramItems: VocabItem[];
  lavatopItems: VocabItem[];
};

export type AssembledPosts = {
  instagram: string;
  title: string;
  description: string;
  publication: string;
};

export const INSTAGRAM_FOOTER =
  "This content is provided to support language learning and educational outreach. Bonus materials are available for free or via Lavatop for those who wish to support the project! Your help is voluntary and supports accessible education for everyone🥳.\nGot any questions? Drop me a DM👌.";

export const LAVATOP_EMAIL =
  "For any questions, please, contact me via e-mail s.p.prof7@yandex.com";

export const STANDARD_HASHTAGS =
  "#englishvocabulary#learnenglish#advancedenglish#englishphrases#collocations#idioms#englishwithfilms#movieenglish#englishlearner#studyenglish#vocabulary#filmquotes#englisheducation";

const DESC_EMOJI = new Set(["🙏", "👍", "😊", "😇", "👌", "🥳", "💪"]);

function stripOuterQuotes(value: string): string {
  return value
    .trim()
    .replace(/^["“”'`‘’]+/, "")
    .replace(/["“”'`‘’]+$/, "")
    .trim();
}

function stripEndPunct(value: string): string {
  return stripOuterQuotes(value).replace(/[.?!…]+$/u, "").trim();
}

function firstEmoji(value: string, fallback: string): string {
  const match = value
    .trim()
    .match(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/u);
  return match?.[0] ?? fallback;
}

function formatItem(n: number, item: VocabItem): string {
  const lemma = stripEndPunct(item.lemma);
  const definition = stripEndPunct(item.definition);
  const example = stripEndPunct(item.example);
  return `${n}) ${lemma}.\n${definition}.\n“${example}”.\n.`;
}

function normalizeHashtags(raw: string, title: string): string {
  const fromModel = raw
    .replace(/\s+/g, "")
    .split("#")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const slug = title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");

  const filmPart = [slug, ...fromModel]
    .filter((tag) => {
      if (!tag) return false;
      const key = tag.toLowerCase().replace(/^#/, "");
      return !STANDARD_HASHTAGS.includes(`#${key}`);
    })
    .filter((tag, index, arr) => {
      const key = tag.toLowerCase().replace(/^#/, "");
      return arr.findIndex((t) => t.toLowerCase().replace(/^#/, "") === key) === index;
    })
    .slice(0, 8)
    .map((tag) => `#${tag.replace(/^#/, "")}`)
    .join("");

  return `${filmPart}${STANDARD_HASHTAGS}`;
}

export function assemblePosts(payload: GeneratedPayload): AssembledPosts {
  const title = payload.title.trim() || "the film";
  const emoji = firstEmoji(payload.emoji, "🎬");
  let descriptionEmoji = firstEmoji(payload.descriptionEmoji, "👍");
  if (!DESC_EMOJI.has(descriptionEmoji)) {
    descriptionEmoji = "👍";
  }

  const instagramItems = payload.instagramItems.slice(0, 7);
  const lavatopItems = payload.lavatopItems.slice(0, 10);

  const instagramBody = instagramItems.map((item, i) => formatItem(i + 1, item)).join("\n");
  const publicationBody = lavatopItems.map((item, i) => formatItem(i + 8, item)).join("\n");
  const hashtags = normalizeHashtags(payload.filmHashtags, title);

  return {
    instagram: `${emoji}Top 7 advanced “${title}” vocabulary.\n.\n${instagramBody}\n${INSTAGRAM_FOOTER}\n.\n${hashtags}`,
    title: `${emoji}Top 10 ‘extra’ advanced “${title}” vocabulary`,
    description: `Find +10 'extra' advanced “${title}” vocabulary and level up your language skills${descriptionEmoji}`,
    publication: `${publicationBody}\n${LAVATOP_EMAIL}`,
  };
}
