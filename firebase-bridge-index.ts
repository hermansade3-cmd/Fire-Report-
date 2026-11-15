// Supabase Edge Function: firebase-bridge
// Inakagua Firebase ID token (saini ya Google, issuer, audience, muda) kisha inarudisha
// kibali cha mara moja (token_hash) ambacho Workplace inabadilisha kuwa session ya Supabase.
// Mtumiaji wa Supabase anafungwa kwenye Firebase UID (si barua pepe) ili kuzuia kuchukua akaunti ya mtu mwingine.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@5.9.6";

const PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") ?? "";
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "*").split(",").map((s) => s.trim());
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGINS.includes("*") ? "*" : ALLOWED_ORIGINS.includes(o) ? o : ALLOWED_ORIGINS[0];
  return { "Access-Control-Allow-Origin": allow, "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
}
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
const hex = (s: string) => Array.from(new TextEncoder().encode(s)).map((b) => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { message: "Method not allowed" }, 405);
  if (!PROJECT_ID) return json(req, { message: "FIREBASE_PROJECT_ID haijawekwa kwenye seva" }, 500);
  try {
    const { idToken } = await req.json();
    if (!idToken || typeof idToken !== "string") return json(req, { message: "idToken inahitajika" }, 400);
    const { payload } = await jwtVerify(idToken, JWKS, { issuer: `https://securetoken.google.com/${PROJECT_ID}`, audience: PROJECT_ID });
    const uid = payload.sub;
    if (!uid) return json(req, { message: "Token si sahihi" }, 401);

    const email = `fb-${hex(uid)}@firebase.fire-report.invalid`; // anwani ya ndani, haitumiwi kutuma barua
    const name = (payload.name as string) || ((payload.email as string) || "").split("@")[0] || "Afisa";
    const { error: cErr } = await admin.auth.admin.createUser({
      email, email_confirm: true,
      user_metadata: { full_name: name, firebase_email: payload.email ?? null },
      app_metadata: { firebase_uid: uid },
    });
    if (cErr && !/already|registered|exists/i.test(cErr.message)) return json(req, { message: cErr.message }, 500);

    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !data?.properties?.hashed_token) return json(req, { message: error?.message ?? "Imeshindikana kutoa kibali" }, 500);
    return json(req, { token_hash: data.properties.hashed_token, type: "magiclink" });
  } catch (e) {
    return json(req, { message: "Token ya Firebase si sahihi au imeisha muda" }, 401);
  }
});
