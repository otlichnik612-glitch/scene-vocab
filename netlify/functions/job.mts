import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

const JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async (req: Request) => {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!JOB_ID.test(id)) {
    return Response.json({ status: "error", error: "Некорректный идентификатор" }, { status: 400 });
  }

  const store = getStore("jobs");
  const data = await store.getJSON(id);
  if (!data) {
    return Response.json({ status: "pending" });
  }
  return Response.json(data);
};

export const config: Config = {};
