import { useEffect, useMemo, useRef } from "react";
import { calcularTime } from "../metricas/index.js";

const fmt = (n) =>
  n === null || n === undefined ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const lista = (ids) => (ids.length ? ids.join(", ") : "nenhum");
const dias = (n) => (n === null || n === undefined ? "—" : String(n));

const COLUNAS = [
  { chave: "id", titulo: "ID" },
  { chave: "status", titulo: "Status" },
  { chave: "criado_em", titulo: "Criado em", data: true },
  { chave: "iniciado_em", titulo: "Iniciado em", data: true },
  { chave: "concluido_em", titulo: "Concluído em", data: true },
  { chave: "emWip", titulo: "Em WIP" },
  { chave: "cycleTime", titulo: "Cycle Time (dias)", numero: true },
  { chave: "leadTime", titulo: "Lead Time (dias)", numero: true },
  { chave: "aging", titulo: "Aging (dias)", numero: true },
  { chave: "naJanela", titulo: "No throughput" },
];

function valorDaCelula(linha, chave) {
  switch (chave) {
    case "emWip":
    case "naJanela":
      return linha[chave] ? "sim" : "não";
    case "cycleTime":
    case "leadTime":
    case "aging":
      return dias(linha[chave]);
    default:
      return linha.item[chave] ?? "—";
  }
}

export default function PainelCalculos({ time, itens, dataReferencia, janelaDias, onFechar }) {
  const r = useMemo(
    () => calcularTime(itens, dataReferencia, janelaDias),
    [itens, dataReferencia, janelaDias]
  );

  const botaoFechar = useRef(null);
  const fecharRef = useRef(onFechar);
  fecharRef.current = onFechar;

  useEffect(() => {
    const anterior = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    botaoFechar.current?.focus();
    const aoTecla = (e) => {
      if (e.key === "Escape") fecharRef.current();
    };
    window.addEventListener("keydown", aoTecla);
    return () => {
      window.removeEventListener("keydown", aoTecla);
      document.body.style.overflow = overflowAnterior;
      anterior?.focus?.();
    };
  }, []);

  const p = r.cycleTimeP85;
  const cycleValores = r.cycleTimes.map((c) => c.dias);
  const leadValores = r.leadTimes.map((l) => l.dias);
  const somaCycle = cycleValores.reduce((s, v) => s + v, 0);
  const somaLead = leadValores.reduce((s, v) => s + v, 0);

  const resumo = [
    {
      nome: "WIP",
      valor: `${r.wip} itens`,
      como: `Itens com iniciado_em até ${dataReferencia} e sem concluido_em nessa data: ${lista(r.idsWip)}.`,
    },
    {
      nome: "Cycle Time médio",
      valor: r.cycleTimeMedio === null ? "—" : `${fmt(r.cycleTimeMedio)} dias`,
      como:
        cycleValores.length === 0
          ? "Nenhum item concluído até a data de referência."
          : `(${cycleValores.join(" + ")}) ÷ ${cycleValores.length} = ${somaCycle} ÷ ${cycleValores.length}.`,
    },
    {
      nome: "Cycle Time P85",
      valor: p.valor === null ? "—" : `${p.valor} dias`,
      como:
        p.n === 0
          ? "Nenhum Cycle Time para ordenar."
          : `Ordenados: ${p.ordenados.join(", ")}. n = ${p.n}. Posição = ⌈0,85 × ${p.n}⌉ = ${p.posicao}. O ${p.posicao}º valor da lista é ${p.valor}.`,
    },
    {
      nome: "Lead Time médio",
      valor: r.leadTimeMedio === null ? "—" : `${fmt(r.leadTimeMedio)} dias`,
      como:
        leadValores.length === 0
          ? "Nenhum item concluído até a data de referência."
          : `(${leadValores.join(" + ")}) ÷ ${leadValores.length} = ${somaLead} ÷ ${leadValores.length}.`,
    },
    {
      nome: `Throughput ${r.janelaDias} dias`,
      valor: `${r.throughput} itens`,
      como: `Itens com concluido_em de ${r.janela.inicio} a ${r.janela.fim}, inclusive (${r.janelaDias} dias corridos): ${lista(r.idsThroughput)}.`,
    },
    {
      nome: "Aging dos itens em WIP",
      valor: r.agings.length ? `maior: ${Math.max(...r.agings.map((a) => a.dias))} dias` : "—",
      como: r.agings.length
        ? `${dataReferencia} − iniciado_em. ${r.agings.map((a) => `${a.id}: ${a.dias}`).join(" · ")}.`
        : "Nenhum item em andamento.",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-30 flex justify-end"
      style={{ background: "rgba(0, 0, 0, 0.45)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-calculos"
        className="flex h-full w-full max-w-4xl flex-col border-l"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}
      >
        <div
          className="flex items-start justify-between gap-3 border-b px-4 pb-3"
          style={{
            borderColor: "var(--line)",
            paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))",
          }}
        >
          <div className="min-w-0">
            <h2 id="titulo-calculos" className="text-base font-semibold">
              Cálculos de {time}
            </h2>
            <p className="data text-xs" style={{ color: "var(--muted)" }}>
              Data de referência {dataReferencia} · janela do throughput {r.janelaDias} dias · dados demonstrativos
            </p>
          </div>
          <button
            ref={botaoFechar}
            type="button"
            onClick={onFechar}
            className="shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium"
            style={{ borderColor: "var(--line)", color: "var(--fg)", background: "var(--surface)" }}
          >
            Fechar
          </button>
        </div>

        <div
          className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-4"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <section aria-labelledby="titulo-resumo">
            <h3 id="titulo-resumo" className="mb-2 text-sm font-semibold">
              Métricas do time
            </h3>
            <dl className="flex flex-col" style={{ borderTop: "1px solid var(--line)" }}>
              {resumo.map((linha) => (
                <div
                  key={linha.nome}
                  className="grid gap-x-4 gap-y-1 py-2.5 sm:grid-cols-[11rem_9rem_minmax(0,1fr)]"
                  style={{ borderBottom: "1px solid var(--line)" }}
                >
                  <dt className="text-sm font-medium">{linha.nome}</dt>
                  <dd className="data text-sm" style={{ color: "var(--accent)" }}>
                    {linha.valor}
                  </dd>
                  <dd className="min-w-0 text-sm" style={{ color: "var(--muted)" }}>
                    {linha.como}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="titulo-por-item">
            <h3 id="titulo-por-item" className="mb-2 text-sm font-semibold">
              Valores por item
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      color: "var(--muted)",
                      borderTop: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    {COLUNAS.map((c) => (
                      <th
                        key={c.chave}
                        scope="col"
                        className={
                          "whitespace-nowrap px-3 py-2 text-xs font-medium " +
                          (c.numero ? "text-right" : "text-left")
                        }
                      >
                        {c.titulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.linhas.map((linha) => (
                    <tr key={linha.item.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      {COLUNAS.map((c) => (
                        <td
                          key={c.chave}
                          className={
                            "whitespace-nowrap px-3 py-2 " +
                            (c.numero ? "data text-right " : "") +
                            (c.data ? "data text-xs" : "")
                          }
                          style={c.chave === "id" ? { color: "var(--accent)" } : undefined}
                        >
                          {valorDaCelula(linha, c.chave)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
