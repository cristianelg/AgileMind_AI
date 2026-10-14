import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  avaliarRiscos, bugsEmAndamento, CONFIG_PADRAO, cycleTime, detalharPercentil85, fmtNum, media,
  throughput, throughputSemanal, wip, type Item,
} from "./core";
import { configurado, supabase } from "./lib/supabase";
import { carregarDemonstrativos, listarItens, ROTULO_DEMO } from "./lib/itens";
import { analisar } from "./lib/analise";

interface Org { id: string; nome: string }

function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  const entrar = async (criar: boolean) => {
    const r = criar ? await supabase.auth.signUp({ email, password: senha }) : await supabase.auth.signInWithPassword({ email, password: senha });
    setMsg(r.error ? r.error.message : criar ? "Conta criada. Se o projeto exige confirmação por e-mail, confirme antes de entrar." : "");
  };
  return (
    <form className="mx-auto mt-16 max-w-sm space-y-3 p-4" onSubmit={(e) => { e.preventDefault(); void entrar(false); }}>
      <h1 className="text-xl font-semibold">AgileMind AI</h1>
      <input className="w-full rounded border p-2" type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="w-full rounded border p-2" type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} />
      <div className="flex gap-2">
        <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Entrar</button>
        <button className="rounded border px-3 py-2" type="button" onClick={() => void entrar(true)}>Criar conta</button>
      </div>
      {msg && <p role="alert" className="text-sm text-red-700">{msg}</p>}
    </form>
  );
}

function Painel({ org }: { org: Org }) {
  const [itens, setItens] = useState<Item[]>([]);
  const [demo, setDemo] = useState(false);
  const [erro, setErro] = useState("");
  const [referencia, setReferencia] = useState("2026-10-13");
  const [analise, setAnalise] = useState("");
  const [carregando, setCarregando] = useState(false);

  const recarregar = useCallback(async () => {
    try { const r = await listarItens(org.id); setItens(r.itens); setDemo(r.demo); setErro(""); }
    catch (e) { setErro((e as Error).message); }
  }, [org.id]);
  useEffect(() => { void recarregar(); }, [recarregar]);

  const times = useMemo(() => [...new Set(itens.map((i) => i.time))], [itens]);
  const [time, setTime] = useState("");
  const timeAtual = time || times[0] || "";
  const doTime = useMemo(() => itens.filter((i) => i.time === timeAtual), [itens, timeAtual]);

  const ciclos = cycleTime(doTime, referencia).map((c) => c.dias);
  const p85 = detalharPercentil85(ciclos);
  const riscos = avaliarRiscos(doTime, referencia, CONFIG_PADRAO).riscos.slice(0, 3);
  const semanal = throughputSemanal(doTime, referencia).map((s) => ({ semana: s.inicio, concluidos: s.total }));

  const pedirAnalise = async () => {
    setCarregando(true); setAnalise("");
    try {
      const pacote = {
        time: timeAtual, data_referencia: referencia, origem_dos_dados: demo ? ROTULO_DEMO : "Dados importados",
        metricas: { wip: wip(doTime, referencia), cycle_time_p85: p85.valor, throughput_28d: throughput(doTime, referencia, 28) },
        riscos_disparados: riscos.map((r) => ({ regra: `${r.codigo} ${r.nome}`, severidade: r.severidade, itens: r.itens, evidencia: r.evidencia })),
      };
      setAnalise(await analisar(org.id, pacote));
    } catch (e) { setAnalise(`Erro: ${(e as Error).message}`); }
    finally { setCarregando(false); }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      {demo && <div role="status" className="rounded bg-amber-100 p-2 text-sm font-medium text-amber-900">{ROTULO_DEMO} · não são dados reais</div>}
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{org.nome}</h1>
        <select aria-label="Time" className="rounded border p-1" value={timeAtual} onChange={(e) => setTime(e.target.value)}>
          {times.map((t) => <option key={t}>{t}</option>)}
        </select>
        <input aria-label="Data de referência" type="date" className="rounded border p-1" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
        <button className="rounded border px-2 py-1" onClick={() => void supabase.auth.signOut()}>Sair</button>
      </header>
      {erro && <p role="alert" className="text-red-700">{erro}</p>}
      {itens.length === 0 ? (
        <section className="space-y-2">
          <p>Esta organização ainda não tem itens.</p>
          <button className="rounded bg-slate-900 px-3 py-2 text-white" onClick={() => void carregarDemonstrativos(org.id).then(recarregar).catch((e: Error) => setErro(e.message))}>
            Carregar dados demonstrativos
          </button>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["WIP", String(wip(doTime, referencia))],
              ["Cycle Time médio (dias)", ciclos.length ? fmtNum(media(ciclos) ?? 0) : "—"],
              ["P85 (dias)", p85.valor === null ? "—" : fmtNum(p85.valor)],
              ["Throughput 28 dias", String(throughput(doTime, referencia, 28))],
              ["Bugs em andamento", String(bugsEmAndamento(doTime, referencia))],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="rounded border p-3"><div className="text-xs text-slate-600">{rotulo}</div><div className="text-2xl font-semibold">{valor}</div></div>
            ))}
          </section>
          <section aria-label="Throughput semanal" className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={semanal}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="semana" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="concluidos" fill="#334155" /></BarChart>
            </ResponsiveContainer>
          </section>
          <section>
            <h2 className="font-semibold">Principais riscos</h2>
            <ul className="list-disc pl-5">{riscos.map((r) => <li key={r.chave}>{r.severidade === "alta" ? "Alta" : "Média"}: {r.nome} ({r.itens.slice(0, 3).join(", ")})</li>)}</ul>
          </section>
          <section className="space-y-2">
            <button className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50" disabled={carregando} onClick={() => void pedirAnalise()}>
              {carregando ? "Analisando…" : "Pedir análise à IA"}
            </button>
            {analise && <pre className="whitespace-pre-wrap rounded border p-3 text-sm">{analise}</pre>}
          </section>
        </>
      )}
    </main>
  );
}

function Organizacao({ session }: { session: Session }) {
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from("organizacoes").select("id,nome").order("nome");
    if (error) setErro(error.message); else setOrgs(data as Org[]);
  }, []);
  useEffect(() => { void carregar(); }, [carregar, session.user.id]);

  if (!orgs) return <p className="p-4">Carregando…</p>;
  if (orgs.length === 0)
    return (
      <form className="mx-auto mt-16 max-w-sm space-y-3 p-4" onSubmit={(e) => { e.preventDefault(); void supabase.rpc("criar_organizacao", { p_nome: nome }).then(({ error }) => (error ? setErro(error.message) : carregar())); }}>
        <h1 className="text-xl font-semibold">Crie sua organização</h1>
        <input className="w-full rounded border p-2" placeholder="Nome da organização" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={120} />
        <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Criar</button>
        {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
      </form>
    );
  return <Painel org={orgs[0]!} />;
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setPronto(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (!configurado) return <p className="p-4">Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY em .env.local (veja .env.example).</p>;
  if (!pronto) return null;
  return session ? <Organizacao session={session} /> : <Login />;
}
