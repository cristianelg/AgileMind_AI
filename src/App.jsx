import { useMemo, useRef, useState } from "react";
import { ITENS_DEMO } from "./dados/csv.js";
import { validarCsv } from "./dados/validarCsv.js";
import ImportarCsv from "./componentes/ImportarCsv.jsx";
import RadarRiscos from "./componentes/RadarRiscos.jsx";
import AgileCoach from "./componentes/AgileCoach.jsx";
import { TEXTOS_PADRAO } from "./riscos/config.js";
import PainelCalculos from "./componentes/PainelCalculos.jsx";
import Dashboard from "./componentes/Dashboard.jsx";
import TabelaItens from "./componentes/TabelaItens.jsx";

// A data de referência é sempre um valor passado às funções de cálculo.
// Aqui fica fixa na data dos dados demonstrativos, não no relógio do sistema.
const DATA_REFERENCIA = "2026-10-13";
const JANELA_THROUGHPUT_DIAS = 28;

const ABAS = [
  {
    id: "dashboard",
    nome: "Dashboard Gerencial",
    texto:
      "Esta aba vai mostrar as métricas de fluxo do time selecionado: WIP, Cycle Time, Lead Time, Throughput e Aging, com P85. Todas calculadas por funções puras, a partir de uma data de referência informada.",
  },
  {
    id: "riscos",
    nome: "Radar de Riscos",
    texto:
      "Esta aba vai listar os maiores riscos da sprint, cada um com a regra disparada, a evidência nos dados, o impacto possível e a ação recomendada. As regras serão explícitas e configuráveis.",
  },
  {
    id: "coach",
    nome: "Agile Coach",
    texto:
      "Esta aba vai usar IA apenas para interpretar resultados já calculados, separando sempre o que é evidência (vem dos dados) do que é hipótese (precisa ser verificada).",
  },
];

export default function App() {
  // Estado em memória. `dados` é o conjunto em uso; `relatorio` guarda o resultado da última importação.
  const [dados, setDados] = useState({ itens: ITENS_DEMO, demo: true });
  const [relatorio, setRelatorio] = useState(null);
  const [dataReferencia, setDataReferencia] = useState(DATA_REFERENCIA);
  const [timeEscolhido, setTime] = useState(null);
  // Limites das regras: o limite de WIP é um só, usado pelo Dashboard e pelo Radar de Riscos.
  const [textosRegras, setTextosRegras] = useState(TEXTOS_PADRAO);
  const [anotacoes, setAnotacoes] = useState({});
  // Planos PDCA do Agile Coach, só em memória.
  const [planos, setPlanos] = useState([]);
  const proximoPlano = useRef(1);
  const [aba, setAba] = useState("dashboard");
  const [calculosAbertos, setCalculosAbertos] = useState(false);

  const TIMES = useMemo(() => [...new Set(dados.itens.map((i) => i.time))], [dados]);
  const time = TIMES.includes(timeEscolhido) ? timeEscolhido : TIMES[0];
  const itensDoTime = useMemo(() => dados.itens.filter((i) => i.time === time), [dados, time]);

  function importar(texto, nome) {
    if (texto === null) {
      setRelatorio({ nome, leituraFalhou: true, avisos: [], aplicado: false, resultado: null });
      return;
    }
    const resultado = validarCsv(texto);
    const aplicado = !resultado.erro && resultado.itens.length > 0;
    const avisos = texto.includes("\uFFFD")
      ? ["O texto tem caracteres ilegíveis. O arquivo provavelmente não está em UTF-8, salve-o assim e importe de novo."]
      : [];
    if (aplicado) setDados({ itens: resultado.itens, demo: false, nome, resultado });
    setRelatorio({ nome, leituraFalhou: false, avisos, aplicado, resultado });
  }

  function restaurar() {
    setDados({ itens: ITENS_DEMO, demo: true });
    setDataReferencia(DATA_REFERENCIA);
    setRelatorio(null);
    setTime(null);
  }

  const atual = ABAS.find((a) => a.id === aba);

  return (
    <div className="min-h-full flex flex-col">
      <header
        className="sticky top-0 z-10 border-b"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}
      >
        <div
          role="status"
          className="px-4 py-1.5 text-center text-xs font-medium tracking-wide border-b"
          style={dados.demo ? { background: "var(--warn-bg)", color: "var(--warn-fg)", borderColor: "var(--warn-line)" } : { background: "var(--accent-soft)", color: "var(--fg)", borderColor: "var(--line)" }}
        >
          {dados.demo
            ? "Dados demonstrativos · não são dados reais"
            : `Dados importados de ${dados.nome} · ${dados.itens.length} ${dados.itens.length === 1 ? "item válido" : "itens válidos"}`}
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-tight">AgileMind AI</h1>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Os riscos da sua sprint, com evidência e ação
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="seletor-time" className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                Time
              </label>
              <select
                id="seletor-time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="rounded-md border px-3 py-1.5 text-sm"
                style={{ background: "var(--surface)", color: "var(--fg)", borderColor: "var(--line-strong)" }}
              >
                {TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setCalculosAbertos(true)}
              className="rounded-md px-3 py-1.5 text-sm font-medium"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              Ver cálculos
            </button>
          </div>
        </div>

        <nav aria-label="Seções" className="mx-auto w-full max-w-6xl px-4">
          <div role="tablist" className="flex gap-1 overflow-x-auto overflow-y-hidden">
            {ABAS.map((a) => {
              const ativa = a.id === aba;
              return (
                <button
                  key={a.id}
                  role="tab"
                  id={"aba-" + a.id}
                  aria-selected={ativa}
                  aria-controls="painel"
                  onClick={() => setAba(a.id)}
                  className="whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-[3px] -mb-px"
                  style={{
                    color: ativa ? "var(--accent)" : "var(--muted)",
                    borderColor: ativa ? "var(--accent)" : "transparent",
                  }}
                >
                  {a.nome}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
        <ImportarCsv
          relatorio={relatorio}
          origemDemo={dados.demo}
          nomeEmUso={dados.nome}
          dataReferencia={dataReferencia}
          onDataReferencia={setDataReferencia}
          onImportar={importar}
          onRestaurar={restaurar}
        />

        <div id="painel" role="tabpanel" aria-labelledby={"aba-" + aba}>
          {aba === "dashboard" ? (
            <Dashboard
              time={time}
              itens={itensDoTime}
              dataReferencia={dataReferencia}
              janelaThroughput={JANELA_THROUGHPUT_DIAS}
              limiteTexto={textosRegras.limiteWip}
              onLimiteTexto={(v) => setTextosRegras((t) => ({ ...t, limiteWip: v }))}
            />
          ) : aba === "riscos" ? (
            <RadarRiscos
              time={time}
              itens={itensDoTime}
              dataReferencia={dataReferencia}
              textos={textosRegras}
              onTextos={setTextosRegras}
              anotacoes={anotacoes}
              onAnotacao={(chave, parcial) => setAnotacoes((a) => ({ ...a, [chave]: { ...a[chave], ...parcial } }))}
            />
          ) : aba === "coach" ? (
            <AgileCoach
              time={time}
              itens={itensDoTime}
              dataReferencia={dataReferencia}
              textosRegras={textosRegras}
              origem={dados}
              planos={planos}
              onAdicionarPlano={(p) => setPlanos((l) => [...l, { ...p, id: proximoPlano.current++ }])}
              onAtualizarPlano={(id, parcial) => setPlanos((l) => l.map((p) => (p.id === id ? { ...p, ...parcial } : p)))}
              onRemoverPlano={(id) => setPlanos((l) => l.filter((p) => p.id !== id))}
            />
          ) : (
            <section
              className="rounded-lg border p-5"
              style={{ background: "var(--surface)", borderColor: "var(--line)" }}
            >
              <h2 className="text-base font-semibold mb-2">{atual.nome}</h2>
              <p className="max-w-prose" style={{ color: "var(--muted)" }}>
                {atual.texto}
              </p>
            </section>
          )}
        </div>

        <TabelaItens time={time} itens={itensDoTime} />
      </main>

      {calculosAbertos && (
        <PainelCalculos
          time={time}
          itens={itensDoTime}
          dataReferencia={dataReferencia}
          janelaDias={JANELA_THROUGHPUT_DIAS}
          onFechar={() => setCalculosAbertos(false)}
        />
      )}
    </div>
  );
}
