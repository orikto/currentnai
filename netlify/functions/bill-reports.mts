import type { Context, Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { getStore } from "@netlify/blobs";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB per photo after client-side compression

function photoStore() {
  return getStore("bill-photos");
}

function decodeDataUrl(dataUrl: string): { bytes: ArrayBuffer; byteLength: number; contentType: string } | null {
  const match = /^data:(image\/(jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const contentType = match[1];
  const b64 = match[3];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return { bytes: arr.buffer, byteLength: arr.byteLength, contentType };
}

export default async (req: Request, _context: Context) => {
  const db = getDatabase();
  const url = new URL(req.url);

  if (req.method === "GET") {
    const division = url.searchParams.get("division");

    const rows = division
      ? await db.sql`SELECT id, division, district, supplier_company, previous_amount, current_amount, percent_change, previous_photo_key, current_photo_key, reporter_name, created_at FROM bill_reports WHERE division = ${division} ORDER BY created_at DESC LIMIT 200`
      : await db.sql`SELECT id, division, district, supplier_company, previous_amount, current_amount, percent_change, previous_photo_key, current_photo_key, reporter_name, created_at FROM bill_reports ORDER BY created_at DESC LIMIT 200`;

    const agg = division
      ? await db.sql`SELECT division, AVG(percent_change)::float AS avg_percent, COUNT(*)::int AS count FROM bill_reports WHERE division = ${division} GROUP BY division`
      : await db.sql`SELECT division, AVG(percent_change)::float AS avg_percent, COUNT(*)::int AS count FROM bill_reports GROUP BY division`;

    const [overall] = await db.sql`SELECT AVG(percent_change)::float AS avg_percent, COUNT(*)::int AS count FROM bill_reports`;

    return new Response(JSON.stringify({ rows, agg, overall }), {
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

    const {
      division,
      district,
      supplier_company,
      previous_amount,
      current_amount,
      previous_photo,
      current_photo,
      reporter_name,
    } = body || {};

    if (!division || typeof division !== "string") {
      return new Response(JSON.stringify({ error: "Division is required" }), { status: 400 });
    }

    const prev = Number(previous_amount);
    const curr = Number(current_amount);
    if (!Number.isFinite(prev) || prev <= 0) {
      return new Response(JSON.stringify({ error: "Invalid previous bill amount" }), { status: 400 });
    }
    if (!Number.isFinite(curr) || curr <= 0) {
      return new Response(JSON.stringify({ error: "Invalid current bill amount" }), { status: 400 });
    }
    if (prev > 1000000 || curr > 1000000) {
      return new Response(JSON.stringify({ error: "Amount too large" }), { status: 400 });
    }

    const percentChange = ((curr - prev) / prev) * 100;

    const dist = district && String(district).trim() ? String(district).trim().slice(0, 80) : null;
    const supplier = supplier_company && String(supplier_company).trim() ? String(supplier_company).trim().slice(0, 80) : null;
    const rn = reporter_name && String(reporter_name).trim() ? String(reporter_name).trim().slice(0, 60) : null;

    const id = crypto.randomUUID();
    let prevKey: string | null = null;
    let currKey: string | null = null;

    const store = photoStore();

    if (previous_photo) {
      const decoded = decodeDataUrl(String(previous_photo));
      if (!decoded) {
        return new Response(JSON.stringify({ error: "Invalid previous bill photo format" }), { status: 400 });
      }
      if (decoded.byteLength > MAX_IMAGE_BYTES) {
        return new Response(JSON.stringify({ error: "Previous bill photo is too large" }), { status: 400 });
      }
      prevKey = `prev-${id}`;
      await store.set(prevKey, decoded.bytes, { metadata: { contentType: decoded.contentType } });
    }

    if (current_photo) {
      const decoded = decodeDataUrl(String(current_photo));
      if (!decoded) {
        return new Response(JSON.stringify({ error: "Invalid current bill photo format" }), { status: 400 });
      }
      if (decoded.byteLength > MAX_IMAGE_BYTES) {
        return new Response(JSON.stringify({ error: "Current bill photo is too large" }), { status: 400 });
      }
      currKey = `curr-${id}`;
      await store.set(currKey, decoded.bytes, { metadata: { contentType: decoded.contentType } });
    }

    const [row] = await db.sql`
      INSERT INTO bill_reports (division, district, supplier_company, previous_amount, current_amount, percent_change, previous_photo_key, current_photo_key, reporter_name)
      VALUES (${division}, ${dist}, ${supplier}, ${prev}, ${curr}, ${percentChange}, ${prevKey}, ${currKey}, ${rn})
      RETURNING id, division, district, supplier_company, previous_amount, current_amount, percent_change, previous_photo_key, current_photo_key, reporter_name, created_at
    `;

    return new Response(JSON.stringify({ row }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/bill-reports",
};
