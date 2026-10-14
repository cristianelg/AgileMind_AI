import { useMemo, useState } from "react";
import { calcularDashboard } from "../metricas/index.js";
import CartaoMetrica, { Selo } from "./CartaoMetrica.jsx";
import { GraficoDispersao, GraficoSemanal } from "./Graficos.jsx";
import { fmtDataBr, fmtItens, fmtNum } from "./formatos.js";

const LIMITE_PADRAO = 5;

const TIPOS = [
  { valor: "todos", rotulo: "Todos os tipos" },
  { valor: "história", rotulo: "História" },
  { valor: "bug", rotulo: "Bug" },
];

const PERIODOS = [
  { id: "tudo", rotulo: "Todo o período", dias: null },
  { id: "14", rotulo: "Últimos 14 dias", dias: 14 },
  { id: "28", rotulo: "Últimos 28 dias", dias: 28 },
  { id: "60", rotulo: "Últimos 60 dias", dias: 60 },
];

const estiloControle = {
  background: "var(--surface)",
  color: "var(--fg)",
  borderColor: "var(--line)",
};

function Controle({ id, rotulo, children, dica }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium" style={{ color: "var(--muted)" }}>
        {rotulo}
      </label>
      {children}
      {dica}
    </div>
  );
}

function BlocoGrafico({ titulo, descricao, children }) {
  return (
    <section
      className="min-w-0 rounded-lg border p-4"
      style={{ background: "var(--surface)", borderColor: "var(--line)" }}
    >
      <h3 className="text-sm font-semibold">{titulo}</h3>
      <p className="mb-3 text-xs" style={{ color: "var(--muted)" }}>
        {descricao}
      </p>
      {children}
    </section>
  );
}

export default function Dashboard({ time, itens, dataReferencia, janelaThroughput }) {
  const [tipo, setTipo] = useState("todos");
  const [periodoId, setPeriodoId] = useState("tudo");
  const [limiteTexto, setLimiteTexto] = useState(String(LIMITE_PADRAO));

  const limiteValido = /^[1-9]\d{0,2}$/.test(limiteTexto);
  const limite = limiteValido ? Number(limiteTexto) : LIMITE_PADRAO;
  const periodo = PERIODOS.find((p) => p.id === periodoId);

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
  const nomeTipo = tipo === "todos" ? null : tipo === "bug" ? "bugs" : "histórias";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-base font-semibold">Dashboard Gerencial</h2>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {time} · data de referência {refBr} · dados demonstrativos
        </p>
      </div>

      <div
        className="flex flex-wrap items-start gap-x-5 gap-y-3 rounded-lg border p-4"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}
      >
        <Controle id="filtro-tipo" rotulo="Tipo">
          <select
            id="filtro-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-sm"
            style={estiloControle}
          >
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
        </Controle>

        <Controle id="filtro-periodo" rotulo="Período">
          <select
            id="filtro-periodo"
            value={periodoId}
            onChange={(e) => setPeriodoId(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-sm"
            style={estiloControle}
          >
            {PERIODOS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.rotulo}
              </option>
            ))}
          </select>
        </Controle>

        <Controle
          id="limite-wip"
          rotulo="Limite de WIP"
          dica={
            !limiteValido && (
              <p className="text-xs" style={{ color: "var(--risco-fg)" }}>
                Informe um número inteiro de 1 a 999. Usando {LIMITE_PADRAO}.
              </p>
            )
          }
        >
          <input
            id="limite-wip"
            type="text"
            inputMode="numeric"
            value={limiteTexto}
            onChange={(e) => setLimiteTexto(e.target.value.trim())}
            aria-invalid={!limiteValido}
            className="data w-24 rounded-md border px-3 py-1.5 text-sm"
            style={estiloControle}
          />
        </Controle>

        <p className="min-w-0 max-w-sm self-end text-xs" style={{ color: "var(--muted)" }}>
          O time vem do seletor no topo. O período vale para Cycle Time e gráficos. WIP e throughput de{" "}
          {janelaThroughput} dias não seguem o período, e o cartão de bugs ignora o tipo.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoMetrica
          titulo={nomeTipo ? `WIP atual (${nomeTipo})` : "WIP atual"}
          alerta={d.wip.acimaDoLimite}
          ajuda={[
            `WIP = itens com iniciado_em preenchido e sem concluido_em em ${refBr}.`,
            "Destaque quando WIP > limite de WIP, que você define no filtro.",
            "Respeita o filtro de tipo. Não depende do período.",
          ]}
          selo={
            d.wip.acimaDoLimite ? (
              <Selo tipo="alerta">Acima do limite em {fmtItens(excesso)}</Selo>
            ) : (
              <Selo tipo="ok">Dentro do limite</Selo>
            )
          }
        >
          <p className="data text-3xl font-medium leading-none">
            {d.wip.valor}
            <span className="ml-2 text-sm font-normal" style={{ color: "var(--muted)" }}>
              limite {d.wip.limite}
            </span>
          </p>
        </CartaoMetrica>

        <CartaoMetrica
          titulo="Cycle Time"
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
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <p className="data text-3xl font-medium leading-none">
                  {fmtNum(d.cycleTime.media)}
                  <span className="mt-1 block text-xs font-normal" style={{ color: "var(--muted)" }}>
                    dias, média
                  </span>
                </p>
                <p className="data text-3xl font-medium leading-none">
                  {fmtNum(d.cycleTime.p85)}
                  <span className="mt-1 block text-xs font-normal" style={{ color: "var(--muted)" }}>
                    dias, P85
                  </span>
                </p>
              </div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                n = {d.cycleTime.n} {d.cycleTime.n === 1 ? "item concluído" : "itens concluídos"}
              </p>
            </>
          )}
        </CartaoMetrica>

        <CartaoMetrica
          titulo={`Throughput, últimos ${d.throughput.janelaDias} dias`}
          ajuda={[
            `Throughput = itens com concluido_em nos últimos ${d.throughput.janelaDias} dias corridos até a data de referência, incluindo-a.`,
            `Janela: ${fmtDataBr(d.throughput.inicio)} a ${fmtDataBr(d.throughput.fim)}.`,
            "Respeita o filtro de tipo. A janela é fixa e não segue o período.",
          ]}
        >
          <p className="data text-3xl font-medium leading-none">
            {d.throughput.valor}
            <span className="ml-2 text-sm font-normal" style={{ color: "var(--muted)" }}>
              {d.throughput.valor === 1 ? "item" : "itens"}
            </span>
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {fmtDataBr(d.throughput.inicio)} a {fmtDataBr(d.throughput.fim)}
          </p>
        </CartaoMetrica>

        <CartaoMetrica
          titulo="Bugs em andamento"
          ajuda={[
            "Bugs em andamento = itens em WIP com tipo = bug.",
            "% do WIP = bugs em andamento ÷ WIP × 100.",
            "Considera todos os tipos do time. Não segue o filtro de tipo nem o período.",
          ]}
        >
          <p className="data text-3xl font-medium leading-none">
            {d.bugs.emAndamento}
            <span className="ml-2 text-sm font-normal" style={{ color: "var(--muted)" }}>
              {d.bugs.percentual === null ? "—" : `${fmtNum(d.bugs.percentual)}% do WIP`}
            </span>
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {d.bugs.emAndamento} de {fmtItens(d.bugs.wipTotal)} em andamento
          </p>
        </CartaoMetrica>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BlocoGrafico
          titulo="Throughput semanal"
          descricao="Itens concluídos por semana, no tipo e período filtrados."
        >
          <GraficoSemanal semanas={d.semanal} />
        </BlocoGrafico>
        <BlocoGrafico
          titulo="Cycle Time por data de conclusão"
          descricao="Cada item concluído, com a linha do P85."
        >
          <GraficoDispersao pontos={d.dispersao} p85={d.cycleTime.p85} />
        </BlocoGrafico>
      </div>
    </div>
  );
}
