// GET /api/school?slug=<slug> -> one school record
const CORS = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Methods":"GET, OPTIONS", "Access-Control-Allow-Headers":"Content-Type" };
export function onRequestOptions(){ return new Response(null,{status:204,headers:CORS}); }
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get("slug") || "").trim();
  if (!slug) return json({ error: "Missing slug" }, 400);
  try {
    if (!env.DB) return json({ error: "D1 binding 'DB' is not configured." }, 500);
    const row = await env.DB
      .prepare("SELECT slug, name, type, canton, province, dre, region, level_id, tagline, doc, junta, cedula_juridica, codigo_mep, sinpe_movil, sinpe_account, is_private FROM schools WHERE slug = ?")
      .bind(slug).first();
    if (!row) return json({ error: "Not found", slug }, 404);
    return json(row, 200, { "Cache-Control": "public, max-age=300" });
  } catch (err) { return json({ error: String(err && err.message || err) }, 500); }
}
function json(o,s=200,e={}){ return new Response(JSON.stringify(o),{status:s,headers:{"Content-Type":"application/json; charset=utf-8",...CORS,...e}}); }
