// Teste de isolamento contra o Supabase LOCAL (Auth real + PostgREST + RLS).
// NÃO rodar contra projeto de produção: cria usuários e organizações de teste.
// Uso: SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_PUBLISHABLE_KEY=<chave de `supabase status`> node scripts/teste-isolamento.mjs
// Premissa a conferir: o Auth local cria sessão no signUp (confirmação de e-mail desligada, que é o padrão local).
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const chave = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !chave) { console.error("Defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY."); process.exit(2); }
if (!/127\.0\.0\.1|localhost/.test(url)) { console.error("Recusado: a URL não é local."); process.exit(2); }

const sufixo = Date.now();
let falhas = 0;
const confere = (ok, msg) => { console.log(`${ok ? "PASS" : "FALHOU"}  ${msg}`); if (!ok) falhas++; };

async function usuario(nome) {
  const c = createClient(url, chave, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signUp({ email: `${nome}.${sufixo}@exemplo.test`, password: "senha-de-teste-123" });
  if (error || !data.session) throw new Error(`signUp de ${nome} falhou: ${error?.message ?? "sem sessão (confirmação de e-mail ligada?)"}`);
  return c;
}
const item = (org_id, codigo) => ({ org_id, codigo, time: "T", tipo: "bug", titulo: codigo, status: "Backlog", criado_em: "2026-10-01", origem: "demonstrativo" });

const a = await usuario("a");
const b = await usuario("b");

const { data: orgA, error: e1 } = await a.rpc("criar_organizacao", { p_nome: "Org A" });
const { data: orgB, error: e2 } = await b.rpc("criar_organizacao", { p_nome: "Org B" });
if (e1 || e2) throw new Error(`criar_organizacao falhou: ${(e1 ?? e2).message}`);

confere(!(await a.from("itens").insert(item(orgA, `A-${sufixo}`))).error, "A insere item na própria organização");
confere(!(await b.from("itens").insert(item(orgB, `B-${sufixo}`))).error, "B insere item na própria organização");

const lerA = await a.from("itens").select("codigo");
confere(lerA.data?.length === 1 && lerA.data[0].codigo === `A-${sufixo}`, "A lê somente o item da organização A");
const lerAB = await a.from("itens").select("codigo").eq("org_id", orgB);
confere(!lerAB.error && lerAB.data.length === 0, "A não lê itens da organização B, mesmo filtrando pelo org_id dela");

confere(!!(await a.from("itens").insert(item(orgB, `INV-${sufixo}`))).error, "A não insere item na organização B");
const upd = await a.from("itens").update({ titulo: "invadido" }).eq("org_id", orgB).select();
confere(!upd.error && upd.data.length === 0, "A não altera itens da organização B");
const del = await a.from("itens").delete().eq("org_id", orgB).select();
confere(!del.error && del.data.length === 0, "A não apaga itens da organização B");

const lerB = await b.from("itens").select("codigo,titulo");
confere(lerB.data?.length === 1 && lerB.data[0].titulo === `B-${sufixo}`, "Item de B segue intacto");

const anon = createClient(url, chave, { auth: { persistSession: false } });
const lerAnon = await anon.from("itens").select("codigo");
confere(!!lerAnon.error || lerAnon.data.length === 0, "Visitante anônimo não lê itens");

console.log(falhas ? `\n${falhas} verificação(ões) falharam.` : "\nIsolamento confirmado.");
process.exit(falhas ? 1 : 0);
