import { useMemo, useState } from "react";
import { ITENS_DEMO, TIMES } from "./dados/csv.js";

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

const COLUNAS = [
  { chave: "id", titulo: "ID", dado: true },
  { chave: "tipo", titulo: "Tipo" },
  { chave: "titulo", titulo: "Título" },
  { chave: "status", titulo: "Status" },
  { chave: "criado_em", titulo: "Criado em", dado: true },
  { chave: "iniciado_em", titulo: "Iniciado em", dado: true },
  { chave: "concluido_em", titulo: "Concluído em", dado: true },
  { chave: "bloqueado", titulo: "Bloqueado" },
  { chave: "bloqueado_desde", titulo: "Bloqueado desde", dado: true },
  { chave: "story_points", titulo: "Pontos", numero: true, dado: true },
  { chave: "adicionado_apos_inicio", titulo: "Adic. após início" },
];

export default function App() {
  const [time, setTime] = useState(TIMES[0]);
  const [aba, setAba] = useState("dashboard");

  const itensDoTime = useMemo(() => ITENS_DEMO.filter((i) => i.time === time), [time]);
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
          style={{ background: "var(--warn-bg)", color: "var(--warn-fg)", borderColor: "var(--warn-line)" }}
        >
          Dados demonstrativos · não são dados reais
        </div>

        <div className="mx-auto w-full max-w-5xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-tight">AgileMind AI</h1>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Os riscos da sua sprint, com evidência e ação
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="seletor-time" className="text-sm" style={{ color: "var(--muted)" }}>
              Time
            </label>
            <select
              id="seletor-time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-md border px-3 py-1.5 text-sm"
              style={{ background: "var(--surface)", color: "var(--fg)", borderColor: "var(--line)" }}
            >
              {TIMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <nav aria-label="Seções" className="mx-auto w-full max-w-5xl px-4">
          <div role="tablist" className="flex gap-1 overflow-x-auto">
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
                  className="whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px"
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

      <main className="mx-auto w-full max-w-5xl px-4 py-6 flex-1">
        <section
          id="painel"
          role="tabpanel"
          aria-labelledby={"aba-" + aba}
          className="rounded-lg border p-5"
          style={{ background: "var(--surface)", borderColor: "var(--line)" }}
        >
          <h2 className="text-base font-semibold mb-2">{atual.nome}</h2>
          <p className="max-w-prose" style={{ color: "var(--muted)" }}>
            {atual.texto}
          </p>
          <p
            className="data mt-5 inline-block rounded px-2.5 py-1 text-xs"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            {time} · {itensDoTime.length} itens carregados
          </p>
        </section>

        <section
          aria-labelledby="titulo-itens"
          className="mt-6 rounded-lg border"
          style={{ background: "var(--surface)", borderColor: "var(--line)" }}
        >
          <div className="px-5 pt-4 pb-3">
            <h2 id="titulo-itens" className="text-base font-semibold">
              Itens do time
            </h2>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              {time} · {itensDoTime.length} itens · dados demonstrativos
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "var(--muted)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
                  {COLUNAS.map((c) => (
                    <th
                      key={c.chave}
                      scope="col"
                      className={"px-3 py-2 text-xs font-medium whitespace-nowrap " + (c.numero ? "text-right" : "text-left")}
                    >
                      {c.titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itensDoTime.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    {COLUNAS.map((c) => (
                      <td
                        key={c.chave}
                        className={
                          "px-3 py-2 whitespace-nowrap " +
                          (c.numero ? "text-right " : "") +
                          (c.dado ? "data text-xs" : "")
                        }
                        style={c.chave === "id" ? { color: "var(--accent)" } : undefined}
                      >
                        {item[c.chave] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
