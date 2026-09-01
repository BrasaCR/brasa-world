// GET /api/schools?province=<name|Others>  OR  ?dre=<region>
// Returns { scope, dre, province, count, schools:[{name,type,canton,province,dre,slug}] }
const CORS = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Methods":"GET, OPTIONS", "Access-Control-Allow-Headers":"Content-Type" };
export function onRequestOptions(){ return new Response(null,{status:204,headers:CORS}); }

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const province = (url.searchParams.get("province") || "").trim();
  const dre = (url.searchParams.get("dre") || "").trim();
  let sql, params;
  if (dre) {
    sql = "SELECT name, type, canton, province, dre, slug FROM schools WHERE dre = ? ORDER BY canton, name";
    params = [dre];
  } else if (province === "" || province === "Others" || province === "Other regions") {
    sql = "SELECT name, type, canton, province, dre, slug FROM schools WHERE province IS NULL ORDER BY name";
    params = [];
  } else {
    sql = "SELECT name, type, canton, province, dre, slug FROM schools WHERE province = ? ORDER BY canton, name";
    params = [province];
  }
  try {
    if (!env.DB) return json({ error: "D1 binding 'DB' is not configured." }, 500);
    const stmt = params.length ? env.DB.prepare(sql).bind(...params) : env.DB.prepare(sql);
    const { results } = await stmt.all();
    return json({ scope: dre ? ("DRE " + dre) : (province || "Others"), dre: dre || null, province: province || null, count: results.length, schools: results }, 200, { "Cache-Control": "public, max-age=300" });
  } catch (err) {
    return json({ error: String(err && err.message || err) }, 500);
  }
}
function json(o,s=200,e={}){ return new Response(JSON.stringify(o),{status:s,headers:{"Content-Type":"application/json; charset=utf-8",...CORS,...e}}); }
