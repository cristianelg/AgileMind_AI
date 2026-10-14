import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { isoDoDia } from "../metricas/index.js";
import { fmtDataBr, fmtDiaMes, fmtItens, fmtNum } from "./formatos.js";

const TICK = { fill: "var(--muted)", fontSize: 12 };
const EIXO = { stroke: "var(--line)" };

function Vazio({ children }) {
  return (
    <p
      className="flex h-40 items-center justify-center rounded-md border border-dashed px-4 text-center text-sm"
      style={{ borderColor: "var(--line)", color: "var(--muted)" }}
    >
      {children}
    </p>
  );
}

function CaixaTooltip({ children }) {
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-md"
      style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--fg)" }}
    >
      {children}
    </div>
  );
}

function TooltipSemana({ active, payload }) {
  if (!active || !payload?.length) return null;
  const s = payload[0].payload;
  return (
    <CaixaTooltip>
      <p className="font-medium">
        {fmtDataBr(s.inicio)} a {fmtDataBr(s.fim)}
      </p>
      <p>
        {fmtItens(s.total)} {s.total === 1 ? "concluído" : "concluídos"}
        {s.parcial ? " · semana parcial" : ""}
      </p>
    </CaixaTooltip>
  );
}

function TooltipPonto({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <CaixaTooltip>
      <p className="font-medium">
        {p.id} · {p.tipo}
      </p>
      <p>Concluído em {fmtDataBr(p.concluidoEm)}</p>
      <p>
        Cycle Time: {fmtNum(p.dias)} {p.dias === 1 ? "dia" : "dias"}
      </p>
    </CaixaTooltip>
  );
}

export function GraficoSemanal({ semanas }) {
  if (semanas.length === 0) {
    return <Vazio>Nenhum item concluído com este filtro. Escolha outro período ou tipo.</Vazio>;
  }
  const dados = semanas.map((s) => ({ ...s, rotulo: fmtDiaMes(s.inicio) }));
  const resumo = dados
    .map((s) => `semana de ${s.rotulo}: ${fmtItens(s.total)}${s.parcial ? " (parcial)" : ""}`)
    .join("; ");

  return (
    <>
      <div
        role="img"
        aria-label={`Throughput semanal em barras. ${resumo}.`}
        style={{ height: 260 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 20, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="rotulo" tick={TICK} tickLine={false} axisLine={EIXO} />
            <YAxis allowDecimals={false} tick={TICK} tickLine={false} axisLine={false} width={32} />
            <Tooltip content={<TooltipSemana />} cursor={{ fill: "var(--accent-soft)" }} />
            <Bar dataKey="total" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={48}>
              {dados.map((s) => (
                <Cell key={s.inicio} fillOpacity={s.parcial ? 0.5 : 1} />
              ))}
              <LabelList dataKey="total" position="top" style={{ fill: "var(--fg)", fontSize: 12 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
        Cada barra é uma semana, de segunda a domingo, identificada pela segunda-feira (dd/MM). Barras mais
        claras são semanas parciais.
      </p>
    </>
  );
}

export function GraficoDispersao({ pontos, p85 }) {
  if (pontos.length === 0) {
    return <Vazio>Nenhum item concluído com este filtro. Escolha outro período ou tipo.</Vazio>;
  }

  const dias = pontos.map((p) => p.dia);
  const min = Math.min(...dias) - 1;
  const max = Math.max(...dias) + 1;
  const passo = Math.max(1, Math.ceil((max - min) / 6));
  const ticks = [];
  for (let t = min; t <= max; t += passo) ticks.push(t);
  const maxY = Math.max(...pontos.map((p) => p.dias), p85 ?? 0) + 2;

  const historias = pontos.filter((p) => p.tipo === "história");
  const bugs = pontos.filter((p) => p.tipo === "bug");
  const resumo = pontos
    .map((p) => `${p.id} concluído em ${fmtDiaMes(p.concluidoEm)} com ${fmtNum(p.dias)} dias`)
    .join("; ");

  return (
    <>
      <div
        role="img"
        aria-label={`Dispersão do Cycle Time por data de conclusão, com linha do P85 em ${fmtNum(p85)} dias. ${resumo}.`}
        style={{ height: 280 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 76, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeOpacity={0.6} />
            <XAxis
              type="number"
              dataKey="dia"
              name="Conclusão"
              domain={[min, max]}
              ticks={ticks}
              tickFormatter={(v) => fmtDiaMes(isoDoDia(v))}
              tick={TICK}
              tickLine={false}
              axisLine={EIXO}
            />
            <YAxis
              type="number"
              dataKey="dias"
              name="Cycle Time"
              allowDecimals={false}
              domain={[0, maxY]}
              tick={TICK}
              tickLine={false}
              axisLine={false}
              width={40}
              label={{ value: "dias", angle: -90, position: "insideLeft", fill: "var(--muted)", fontSize: 12 }}
            />
            <Tooltip content={<TooltipPonto />} cursor={{ strokeDasharray: "3 3", stroke: "var(--muted)" }} />
            <Legend
              verticalAlign="top"
              height={28}
              formatter={(valor) => <span style={{ color: "var(--fg)", fontSize: 12 }}>{valor}</span>}
            />
            {p85 !== null && (
              <ReferenceLine
                y={p85}
                stroke="var(--fg)"
                strokeDasharray="6 4"
                label={{
                  value: `P85: ${fmtNum(p85)} ${p85 === 1 ? "dia" : "dias"}`,
                  position: "right",
                  fill: "var(--fg)",
                  fontSize: 12,
                }}
              />
            )}
            <Scatter name="História" data={historias} fill="var(--accent)" shape="circle" />
            <Scatter name="Bug" data={bugs} fill="var(--bug)" shape="diamond" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
        Cada ponto é um item concluído: no eixo horizontal a data de conclusão, no vertical o Cycle Time em dias.
        A linha tracejada é o P85 dos itens exibidos.
      </p>
    </>
  );
}
