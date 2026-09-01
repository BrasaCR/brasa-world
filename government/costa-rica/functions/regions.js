// GET /api/regions -> the 27 DRE regions with school counts (for the government Education index)
const CORS = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Methods":"GET, OPTIONS", "Access-Control-Allow-Headers":"Content-Type" };
export function onRequestOptions(){ return new Response(null,{status:204,headers:CORS}); }
export async function onRequestGet({ env }) {
  try {
    if (!env.DB) return json({ error: "D1 binding 'DB' is not configured." }, 500);
    const { results } = await env.DB
      .prepare("SELECT dre, MAX(province) AS province, COUNT(*) AS count FROM schools WHERE dre IS NOT NULL GROUP BY dre ORDER BY count DESC")
      .all();
    return json({ count: results.length, regions: results }, 200, { "Cache-Control": "public, max-age=300" });
  } catch (err) { return json({ error: String(err && err.message || err) }, 500); }
}
function json(o,s=200,e={}){ return new Response(JSON.stringify(o),{status:s,headers:{"Content-Type":"application/json; charset=utf-8",...CORS,...e}}); }
