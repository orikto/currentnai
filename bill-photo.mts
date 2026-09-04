import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");

  if (!key || !/^(prev|curr)-[a-f0-9-]{36}$/.test(key)) {
    return new Response("Not found", { status: 404 });
  }

  const store = getStore("bill-photos");
  const result = await store.getWithMetadata(key, { type: "arrayBuffer" });

  if (!result || !result.data) {
    return new Response("Not found", { status: 404 });
  }

  const contentType = (result.metadata && (result.metadata as any).contentType) || "image/jpeg";

  return new Response(result.data as ArrayBuffer, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

export const config: Config = {
  path: "/api/bill-photo",
};
