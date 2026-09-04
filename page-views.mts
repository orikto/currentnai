import type { Context, Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";

export default async (req: Request, _context: Context) => {
  const db = getDatabase();

  if (req.method === "GET") {
    const [today] = await db.sql`
      SELECT COUNT(*)::int AS count FROM page_views WHERE visit_date = CURRENT_DATE
    `;
    const [allTime] = await db.sql`
      SELECT COUNT(*)::int AS count FROM page_views
    `;
    return new Response(
      JSON.stringify({ today: today?.count || 0, allTime: allTime?.count || 0 }),
      { headers: { "content-type": "application/json" } }
    );
  }

  if (req.method === "POST") {
    await db.sql`INSERT INTO page_views DEFAULT VALUES`;
    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/page-views",
};
