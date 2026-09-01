// Payments (BRASA records, never holds funds).
// POST /api/pay { slug, amount, concept, payer_ref? } -> pending record + SINPE instructions
// GET  /api/pay?id=CR-XXXX -> status
const CORS = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Methods":"GET, POST, OPTIONS", "Access-Control-Allow-Headers":"Content-Type" };
export function onRequestOptions(){ return new Response(null,{status:204,headers:CORS}); }

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ error: "D1 binding 'DB' is not configured." }, 500);
    const body = await request.json().catch(() => ({}));
    const slug = (body.slug || "").trim();
    const amount = Number(body.amount);
    const concept = ((body.concept || "").trim()) || "Pago";
    const payer_ref = ((body.payer_ref || "").trim()) || null;
    if (!slug) return json({ error: "Missing slug" }, 400);
    if (!(amount > 0)) return json({ error: "Invalid amount" }, 400);
    const school = await env.DB
      .prepare("SELECT name, junta, sinpe_movil, sinpe_account, cedula_juridica FROM schools WHERE slug = ?")
      .bind(slug).first();
    if (!school) return json({ error: "Not found", slug }, 404);
    const destination = school.sinpe_movil || school.sinpe_account || null;
    if (!destination) return json({ available: false, message: "This school has no SINPE destination registered yet." }, 200);
    const id = "CR-" + code(8);
    const created_at = new Date().toISOString();
    await env.DB
      .prepare("INSERT INTO school_payments (id, school_slug, payer_ref, amount, concept, sinpe_ref, tiquete_id, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(id, slug, payer_ref, amount, concept, null, null, "pending", created_at).run();
    return json({ available: true, status: "pending", reference: id, payee: school.junta || school.name, cedula: school.cedula_juridica || null, destination, amount, concept, created_at }, 201);
  } catch (err) { return json({ error: String(err && err.message || err) }, 500); }
}
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const id = (url.searchParams.get("id") || "").trim();
  if (!id) return json({ error: "Missing id" }, 400);
  try {
    if (!env.DB) return json({ error: "D1 binding 'DB' is not configured." }, 500);
    const row = await env.DB.prepare("SELECT id, school_slug, amount, concept, status, sinpe_ref, tiquete_id, created_at FROM school_payments WHERE id = ?").bind(id).first();
    if (!row) return json({ error: "Not found" }, 404);
    return json(row);
  } catch (err) { return json({ error: String(err && err.message || err) }, 500); }
}
function code(n){ const a="ABCDEFGHJKMNPQRSTUVWXYZ23456789"; const b=crypto.getRandomValues(new Uint8Array(n)); let s=""; for(let i=0;i<n;i++) s+=a[b[i]%a.length]; return s; }
function json(o,s=200,e={}){ return new Response(JSON.stringify(o),{status:s,headers:{"Content-Type":"application/json; charset=utf-8",...CORS,...e}}); }
