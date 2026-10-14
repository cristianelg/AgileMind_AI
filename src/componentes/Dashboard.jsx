import { useMemo, useState } from "react";
import { calcularDashboard } from "../metricas/index.js";
import Indicador, { Selo } from "./Indicador.jsx";
import { FilaBugs, FilaWip } from "./Fila.jsx";
import Segmentado from "./Segmentado.jsx";
import { GraficoDispersao, GraficoSemanal } from "./Graficos.jsx";
import { fmtDataBr, fmtItens, fmtNum } from "./formatos.js";

const LIMITE_PADRAO = 5;

const TIPOS = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "história", rotulo: "Histórias" },
  { valor: "bug", rotulo: "Bugs" },
];

const PERIODOS = [
  { valor: "tudo", rotulo: "Tudo", dias: null },
  { valor: "14", rotulo: "14 dias", dias: 14 },
  { valor: "28", rotulo: "28 dias", dias: 28 },
  { valor: "60", rotulo: "60 dias", dias: 60 },
];

function Numero({ valor, unidade, tamanho = "text-4xl" }) {
  return (
    <p className="flex items-baseline gap-2">
      <span className={`num leading-none ${tamanho}`}>{valor}</span>
      {unidade && (
        <span className="text-sm" style={{ color: "var(--muted)" }}>
          {unidade}
        </span>
      )}
    </p>
  );
}

function BlocoGrafico({ titulo, descricao, className = "", children }) {
  return (
    <section className={"min-w-0 p-5 " + className}>
      <h3 className="text-base font-semibold">{titulo}</h3>
      <p className="mb-3 text-sm" style={{ color: "var(--muted)" }}>
        {descricao}
      </p>
      {children}
    </section>
  );
}

export default function Dashboard({ time, itens, dataReferencia, janelaThroughput, limiteTexto, onLimiteTexto }) {
  const [tipo, setTipo] = useState("todos");
  const [periodoId, setPeriodoId] = useState("tudo");

  const limiteValido = /^[1-9]\d{0,2}$/.test(limiteTexto);
  const limite = limiteValido ? Number(limiteTexto) : LIMITE_PADRAO;
  const periodo = PERIODOS.find((p) => p.valor === periodoId);

  const d = useMemo(
    () =>
      calcularDashboard(itens, dataReferencia, {
        tipo,
        periodoDias: periodo.dias,
        limiteWip: limite,
        janelaThroughput,
      }),
    [itens, dataReferencia, tipo, periodo.dias, limite, janelaThroughput]
  );

  const refBr = fmtDataBr(dataReferencia);
  const excesso = d.wip.valor - d.wip.limite;
  const alerta = d.wip.acimaDoLimite;
  const nomeTipo = tipo === "todos" ? null : tipo === "bug" ? "bugs" : "histórias";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-tight">Dashboard Gerencial</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {time} · referência em {refBr}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Segmentado nome="filtro-tipo" rotulo="Tipo" valor={tipo} opcoes={TIPOS} onChange={setTipo} />
          <Segmentado
            nome="filtro-periodo"
            rotulo="Período"
            valor={periodoId}
            opcoes={PERIODOS}
            onChange={setPeriodoId}
          />
          <div className="flex items-center gap-2">
            <label htmlFor="limite-wip" className="text-sm font-medium" style={{ color: "var(--muted)" }}>
              Limite de WIP
            </label>
            <input
              id="limite-wip"
              type="text"
              inputMode="numeric"
              value={limiteTexto}
              onChange={(e) => onLimiteTexto(e.target.value.trim())}
              aria-invalid={!limiteValido}
              aria-describedby={limiteValido ? undefined : "erro-limite"}
              className="data w-16 rounded-md border px-2 py-1.5 text-center text-sm"
              style={{
                background: "var(--surface)",
                color: "var(--fg)",
                borderColor: limiteValido ? "var(--line-strong)" : "var(--risco-line)",
              }}
            />
          </div>
        </div>
      </div>

      {!limiteValido && (
        <p id="erro-limite" className="text-sm" style={{ color: "var(--risco-fg)" }}>
          Informe um número inteiro de 1 a 999. Usando {LIMITE_PADRAO} até corrigir.
        </p>
      )}

      <div
        className="overflow-hidden rounded-lg border"
        style={{
          background: "var(--surface)",
          borderColor: alerta ? "var(--risco-line)" : "var(--line)",
        }}
      >
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]"
          style={{ gap: "1px", background: "var(--line)" }}
        >
          <Indicador
            titulo={nomeTipo ? `WIP atual (${nomeTipo})` : "WIP atual"}
            escopo="Segue o tipo. Ignora o período."
            className="sm:col-span-2 lg:col-span-1"
            ajuda={[
              `WIP = itens com iniciado_em preenchido e sem concluido_em em ${refBr}.`,
              "Destaque quando WIP > limite de WIP, que você define no filtro.",
              "Respeita o filtro de tipo. Não depende do período.",
            ]}
            fundo={alerta ? "var(--risco-bg)" : "var(--surface)"}
          >
            <Numero valor={d.wip.valor} unidade={`limite ${d.wip.limite}`} tamanho="text-6xl" />
            <FilaWip wip={d.wip.valor} limite={d.wip.limite} />
            {alerta ? (
              <Selo tipo="alerta">Acima do limite em {fmtItens(excesso)}</Selo>
            ) : (
              <Selo tipo="ok">Dentro do limite</Selo>
            )}
          </Indicador>

          <Indicador
            titulo="Cycle Time"
            escopo="Segue tipo e período."
            ajuda={[
              "Cycle Time = concluido_em − iniciado_em, em dias corridos.",
              "Média = soma dos Cycle Times ÷ n.",
              "P85 (nearest-rank) = valor na posição ⌈0,85 × n⌉ da lista ordenada.",
              "Considera os itens concluídos no período e no tipo filtrados. O painel Ver cálculos mostra o passo a passo.",
            ]}
          >
            {d.cycleTime.n === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Nenhum item concluído com este filtro.
              </p>
            ) : (
              <>
                <div className="flex gap-6">
                  <div>
                    <Numero valor={fmtNum(d.cycleTime.media)} tamanho="text-4xl" />
                    <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                      dias, média
                    </p>
                  </div>
                  <div>
                    <Numero valor={fmtNum(d.cycleTime.p85)} tamanho="text-4xl" />
                    <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                      dias, P85
                    </p>
                  </div>
                </div>
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  n = {d.cycleTime.n} {d.cycleTime.n === 1 ? "item concluído" : "itens concluídos"}
                </p>
              </>
            )}
          </Indicador>

          <Indicador
            titulo={`Throughput, últimos ${d.throughput.janelaDias} dias`}
            escopo="Segue o tipo. Janela fixa."
            ajuda={[
              `Throughput = itens com concluido_em nos últimos ${d.throughput.janelaDias} dias corridos até a data de referência, incluindo-a.`,
              `Janela: ${fmtDataBr(d.throughput.inicio)} a ${fmtDataBr(d.throughput.fim)}.`,
              "Respeita o filtro de tipo. A janela é fixa e não segue o período.",
            ]}
          >
            <Numero valor={d.throughput.valor} unidade={d.throughput.valor === 1 ? "item" : "itens"} />
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {fmtDataBr(d.throughput.inicio)} a {fmtDataBr(d.throughput.fim)}
            </p>
          </Indicador>

          <Indicador
            titulo="Bugs em andamento"
            escopo="Todos os tipos. Ignora os filtros."
            ajuda={[
              "Bugs em andamento = itens em WIP com tipo = bug.",
              "% do WIP = bugs em andamento ÷ WIP × 100.",
              "Considera todos os tipos do time. Não segue o filtro de tipo nem o período.",
            ]}
          >
            <Numero
              valor={d.bugs.emAndamento}
              unidade={d.bugs.percentual === null ? "—" : `${fmtNum(d.bugs.percentual)}% do WIP`}
            />
            <FilaBugs total={d.bugs.wipTotal} bugs={d.bugs.emAndamento} />
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {d.bugs.emAndamento} de {fmtItens(d.bugs.wipTotal)} em andamento
            </p>
          </Indicador>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-lg border"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: "1px", background: "var(--line)" }}>
          <BlocoGrafico
            titulo="Throughput semanal"
            descricao="Itens concluídos por semana, no tipo e período filtrados."
            className="bg-[var(--surface)]"
          >
            <GraficoSemanal semanas={d.semanal} />
          </BlocoGrafico>
          <BlocoGrafico
            titulo="Cycle Time por data de conclusão"
            descricao="Cada item concluído, com a linha do P85."
            className="bg-[var(--surface)]"
          >
            <GraficoDispersao pontos={d.dispersao} p85={d.cycleTime.p85} />
          </BlocoGrafico>
        </div>
      </div>
    </div>
  );
}
