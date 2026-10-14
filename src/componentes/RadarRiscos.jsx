import { useId, useMemo } from "react";
import { avaliarRiscos, ROTULO_SEVERIDADE } from "../riscos/regras.js";
import { lerConfig } from "../riscos/config.js";
import { fmtDataBr } from "./formatos.js";

const ESTILO_SEVERIDADE = {
  alta: { fundo: "var(--risco-bg)", texto: "var(--risco-fg)", borda: "var(--risco-line)", icone: "▲" },
  media: { fundo: "var(--warn-bg)", texto: "var(--warn-fg)", borda: "var(--warn-line)", icone: "◆" },
};

const CAMPOS_REGRAS = [
  {
    campo: "fatorAlta",
    codigo: "R1",
    titulo: "Item envelhecido: fator da severidade alta",
    descricao:
      "Dispara quando o aging passa do P85 do Cycle Time do time. É alta se passar de fator × P85, senão média.",
    sufixo: "× P85",
  },
  {
    campo: "diasBloqueio",
    codigo: "R2",
    titulo: "Bloqueio prolongado: dias",
    descricao: "Dispara para item em andamento bloqueado há mais de N dias. Severidade alta.",
    sufixo: "dias",
  },
  {
    campo: "limiteWip",
    codigo: "R3",
    titulo: "WIP acima do limite",
    descricao: "Dispara quando o WIP passa do limite. É o mesmo limite do Dashboard. Severidade média.",
    sufixo: "itens",
  },
  {
    campo: "percentualBugs",
    codigo: "R4",
    titulo: "Bugs dominando o fluxo: % do WIP",
    descricao: "Dispara quando mais de N% do WIP é bug. Severidade alta.",
    sufixo: "%",
  },
];

function Selo({ severidade }) {
  const e = ESTILO_SEVERIDADE[severidade];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold"
      style={{ background: e.fundo, color: e.texto }}
    >
      <span aria-hidden="true">{e.icone}</span>
      Severidade {ROTULO_SEVERIDADE[severidade].toLowerCase()}
    </span>
  );
}

function CartaoRisco({ risco, posicao, anotacao, onAnotacao }) {
  const id = useId();
  const e = ESTILO_SEVERIDADE[risco.severidade];
  return (
    <article
      aria-labelledby={`${id}-titulo`}
      className="flex min-w-0 flex-col gap-4 rounded-lg border p-4"
      style={{
        background: "var(--surface)",
        borderColor: "var(--line)",
        borderLeft: `6px solid ${e.borda}`,
      }}
    >
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {posicao && (
            <span
              className="num flex h-7 w-7 items-center justify-center rounded-full text-sm"
              style={{ background: "var(--fg)", color: "var(--surface)" }}
              aria-label={`Posição ${posicao}`}
            >
              {posicao}
            </span>
          )}
          <span
            className="data rounded border px-2 py-0.5 text-sm font-medium"
            style={{ borderColor: "var(--line-strong)" }}
          >
            {risco.codigo}
          </span>
          <Selo severidade={risco.severidade} />
        </div>
        <h4 id={`${id}-titulo`} className="text-base font-semibold leading-snug">
          {risco.nome}
          {risco.codigo === "R1" || risco.codigo === "R2" ? `: ${risco.itens[0]}` : ""}
        </h4>
      </header>

      <section aria-label="Evidência">
        <h5 className="mb-1 text-sm font-semibold">Evidência</h5>
        <dl className="flex flex-col gap-1 text-sm">
          {risco.evidencia.map((linha) => (
            <div key={linha.rotulo} className="flex flex-col sm:flex-row sm:gap-2">
              <dt className="shrink-0 sm:w-44" style={{ color: "var(--muted)" }}>
                {linha.rotulo}
              </dt>
              <dd className="min-w-0 break-words">{linha.valor}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label="Impacto possível">
        <h5 className="mb-1 text-sm font-semibold">Impacto possível (hipótese)</h5>
        <p
          className="rounded-md border border-dashed p-2 text-sm"
          style={{ borderColor: "var(--line-strong)", color: "var(--fg)" }}
        >
          {risco.impacto}
        </p>
      </section>

      <section aria-label="Ação recomendada">
        <h5 className="mb-1 text-sm font-semibold">Ação recomendada</h5>
        <p className="text-sm">{risco.acao}</p>
      </section>

      <div className="mt-auto grid grid-cols-1 gap-3 border-t pt-3 sm:grid-cols-2" style={{ borderColor: "var(--line)" }}>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-resp`} className="text-sm font-medium" style={{ color: "var(--muted)" }}>
            Responsável
          </label>
          <input
            id={`${id}-resp`}
            type="text"
            value={anotacao?.responsavel ?? ""}
            onChange={(ev) => onAnotacao(risco.chave, { responsavel: ev.target.value })}
            className="rounded-md border px-2 py-1.5 text-sm"
            style={{ background: "var(--surface)", color: "var(--fg)", borderColor: "var(--line-strong)" }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-prazo`} className="text-sm font-medium" style={{ color: "var(--muted)" }}>
            Prazo
          </label>
          <input
            id={`${id}-prazo`}
            type="date"
            value={anotacao?.prazo ?? ""}
            onChange={(ev) => onAnotacao(risco.chave, { prazo: ev.target.value })}
            className="data rounded-md border px-2 py-1.5 text-sm"
            style={{ background: "var(--surface)", color: "var(--fg)", borderColor: "var(--line-strong)" }}
          />
        </div>
      </div>
    </article>
  );
}

function PainelRegras({ textos, erros, onTextos }) {
  return (
    <details className="group rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
        <span>
          <h3 className="inline text-sm font-semibold">Regras</h3>
          <span className="ml-2 text-sm" style={{ color: "var(--muted)" }}>
            limites usados para detectar os riscos
          </span>
        </span>
        <span className="shrink-0 text-xs font-medium" style={{ color: "var(--accent)" }}>
          <span className="group-open:hidden">Configurar</span>
          <span className="hidden group-open:inline">Fechar</span>
        </span>
      </summary>
      <div className="grid grid-cols-1 gap-4 border-t px-4 py-4 sm:grid-cols-2 lg:grid-cols-4" style={{ borderColor: "var(--line)" }}>
        {CAMPOS_REGRAS.map((c) => (
          <div key={c.campo} className="flex min-w-0 flex-col gap-1">
            <label htmlFor={`regra-${c.campo}`} className="text-sm font-medium">
              <span className="data mr-1 text-xs" style={{ color: "var(--accent)" }}>
                {c.codigo}
              </span>
              {c.titulo}
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`regra-${c.campo}`}
                type="text"
                inputMode="decimal"
                value={textos[c.campo]}
                onChange={(e) => onTextos({ ...textos, [c.campo]: e.target.value })}
                aria-invalid={Boolean(erros[c.campo])}
                aria-describedby={`desc-${c.campo}`}
                className="data w-20 rounded-md border px-2 py-1.5 text-center text-sm"
                style={{
                  background: "var(--surface)",
                  color: "var(--fg)",
                  borderColor: erros[c.campo] ? "var(--risco-line)" : "var(--line-strong)",
                }}
              />
              <span className="text-sm" style={{ color: "var(--muted)" }}>
                {c.sufixo}
              </span>
            </div>
            <p id={`desc-${c.campo}`} className="text-xs" style={{ color: erros[c.campo] ? "var(--risco-fg)" : "var(--muted)" }}>
              {erros[c.campo] ? `${erros[c.campo]} Usando o valor padrão.` : c.descricao}
            </p>
          </div>
        ))}
        <p className="text-xs sm:col-span-2 lg:col-span-4" style={{ color: "var(--muted)" }}>
          <span className="data mr-1" style={{ color: "var(--accent)" }}>
            R5
          </span>
          Escopo adicionado após o início: dispara quando há itens com adicionado_apos_inicio = sim, em qualquer
          status. Severidade média, sem limite configurável. Todas as comparações são "maior que".
        </p>
      </div>
    </details>
  );
}

export default function RadarRiscos({ time, itens, dataReferencia, textos, onTextos, anotacoes, onAnotacao }) {
  const { config, erros } = useMemo(() => lerConfig(textos), [textos]);
  const resultado = useMemo(() => avaliarRiscos(itens, dataReferencia, config), [itens, dataReferencia, config]);

  const { riscos, naoAvaliadas } = resultado;
  const top = riscos.slice(0, 3);
  const demais = riscos.slice(3);
  const altas = riscos.filter((r) => r.severidade === "alta").length;
  const medias = riscos.length - altas;
  const chaveNota = (chave) => `${time}|${chave}`;
  const anotar = (chave, parcial) => onAnotacao(chaveNota(chave), parcial);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold leading-tight">Radar de Riscos</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {time} · referência em {fmtDataBr(dataReferencia)} ·{" "}
          {riscos.length === 0
            ? "nenhum risco com os limites atuais"
            : `${riscos.length} ${riscos.length === 1 ? "risco" : "riscos"}: ${altas} de severidade alta e ${medias} de média`}
        </p>
        <p className="mt-1 max-w-3xl text-sm" style={{ color: "var(--muted)" }}>
          Cada risco vem de uma regra explícita aplicada aos dados do time. Sem IA nesta aba. O impacto é sempre
          uma hipótese a verificar.
        </p>
      </div>

      <PainelRegras textos={textos} erros={erros} onTextos={onTextos} />

      {naoAvaliadas.map((n) => (
        <p
          key={n.codigo}
          role="status"
          className="rounded-md border px-3 py-2 text-sm"
          style={{ background: "var(--warn-bg)", color: "var(--warn-fg)", borderColor: "var(--warn-line)" }}
        >
          <span className="data font-medium">{n.codigo}</span> não foi avaliada: {n.motivo}
        </p>
      ))}

      {riscos.length === 0 ? (
        <p
          className="rounded-lg border p-5 text-sm"
          style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--muted)" }}
        >
          Nenhuma regra disparou para {time} com os limites atuais. Isso não garante ausência de risco: as regras
          cobrem só envelhecimento, bloqueio, WIP, bugs e escopo adicionado. Ajuste os limites no painel Regras
          se quiser um critério mais sensível.
        </p>
      ) : (
        <>
          <section aria-labelledby="titulo-top3" className="flex flex-col gap-3">
            <h3 id="titulo-top3" className="text-lg font-semibold">
              Os 3 riscos da sprint
            </h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {top.map((r, i) => (
                <CartaoRisco
                  key={r.chave}
                  risco={r}
                  posicao={i + 1}
                  anotacao={anotacoes[chaveNota(r.chave)]}
                  onAnotacao={anotar}
                />
              ))}
            </div>
          </section>

          {demais.length > 0 && (
            <section aria-labelledby="titulo-demais" className="flex flex-col gap-3">
              <h3 id="titulo-demais" className="text-base font-semibold">
                Demais riscos ({demais.length})
              </h3>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {demais.map((r) => (
                  <CartaoRisco key={r.chave} risco={r} anotacao={anotacoes[chaveNota(r.chave)]} onAnotacao={anotar} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
