// Edge Function "analisar" (Deno). A chave do modelo vive só em secrets; o front-end nunca a recebe.
// Fluxo: valida entrada -> identifica o usuário pelo JWT -> confere que ele é membro da organização
// (via RLS, com o token do próprio usuário) -> monta o prompt -> chama o modelo -> devolve o texto.
// O pacote NÃO é gravado em log.
// CONFERIR NA DOCUMENTAÇÃO: versão do import do supabase-js, API Deno.serve, verify_jwt em config.toml.
import { createClient } from "npm:@supabase/supabase-js@2";
import { extrairTexto, montarPrompt, montarRequisicao, validarEntrada } from "./handler.ts";
import { PROMPT_ANALISE, PROMPT_PENDENTE } from "./prompt.ts";

const CORS = {
  "access-control-allow-origin": Deno.env.get("ORIGEM_PERMITIDA") ?? "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
};
const json = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { erro: "Use POST." });

  if (PROMPT_PENDENTE) return json(503, { erro: "O prompt de análise oficial ainda não foi configurado." });

  const chave = Deno.env.get("ANTHROPIC_API_KEY");
  const modelo = Deno.env.get("MODELO_IA");
  if (!chave || !modelo) return json(500, { erro: "Função sem configuração (ANTHROPIC_API_KEY e MODELO_IA)." });

  const auth = req.headers.get("authorization");
  if (!auth) return json(401, { erro: "Faça login." });

  let corpo: unknown;
  try { corpo = await req.json(); } catch { return json(400, { erro: "JSON inválido." }); }
  const entrada = validarEntrada(corpo);
  if (!entrada.ok) return json(entrada.status, { erro: entrada.erro });

  // Cliente com o token DO USUÁRIO: toda leitura passa pela RLS.
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: usuario, error: erroUsuario } = await supabase.auth.getUser();
  if (erroUsuario || !usuario.user) return json(401, { erro: "Sessão inválida." });

  const { data: org, error: erroOrg } = await supabase.from("organizacoes").select("id").eq("id", entrada.orgId).maybeSingle();
  if (erroOrg || !org) return json(403, { erro: "Sem acesso a esta organização." });

  const req2 = montarRequisicao({ modelo, chave, prompt: montarPrompt(PROMPT_ANALISE, entrada.pacoteTexto) });
  let resp: Response;
  try { resp = await fetch(req2.url, req2.init); } catch { return json(502, { erro: "Falha ao contatar o serviço de IA." }); }
  if (!resp.ok) return json(502, { erro: `O serviço de IA recusou a chamada (HTTP ${resp.status}).` });

  const texto = extrairTexto(await resp.json());
  if (!texto) return json(502, { erro: "Resposta do serviço de IA em formato inesperado." });
  return json(200, { texto });
});
