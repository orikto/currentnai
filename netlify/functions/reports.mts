import type { Context, Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";

const VALID_DIVISIONS = [
  "Dhaka",
  "Chattogram",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
];

export default async (req: Request, _context: Context) => {
  const db = getDatabase();
  const url = new URL(req.url);

  if (req.method === "GET") {
    const date = url.searchParams.get("date");

    const rows = date
      ? await db.sql`SELECT id, division, report_date, hours, note, created_at FROM reports WHERE report_date = ${date} ORDER BY created_at DESC LIMIT 200`
      : await db.sql`SELECT id, division, report_date, hours, note, created_at FROM reports ORDER BY created_at DESC LIMIT 200`;

    const agg = date
      ? await db.sql`SELECT division, AVG(hours)::float AS avg_hours, COUNT(*)::int AS count FROM reports WHERE report_date = ${date} GROUP BY division`
      : await db.sql`SELECT division, AVG(hours)::float AS avg_hours, COUNT(*)::int AS count FROM reports GROUP BY division`;

    return new Response(JSON.stringify({ rows, agg }), {
      headers: { "content-type": "application/json" },
    });
  }

  if (req.method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const { division, report_date, hours, note } = body || {};

    if (!VALID_DIVISIONS.includes(division)) {
      return new Response(JSON.stringify({ error: "Invalid division" }), { status: 400 });
    }

    const h = Number(hours);
    if (!Number.isFinite(h) || h < 0 || h > 24) {
      return new Response(JSON.stringify({ error: "Invalid hours (0-24)" }), { status: 400 });
    }

    const d = String(report_date || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return new Response(JSON.stringify({ error: "Invalid date" }), { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    if (d > today) {
      return new Response(JSON.stringify({ error: "Date cannot be in the future" }), { status: 400 });
    }

    const n = note ? String(note).slice(0, 280) : null;

    const [row] = await db.sql`
      INSERT INTO reports (division, report_date, hours, note)
      VALUES (${division}, ${d}, ${h}, ${n})
      RETURNING id, division, report_date, hours, note, created_at
    `;

    return new Response(JSON.stringify({ row }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/reports",
};
