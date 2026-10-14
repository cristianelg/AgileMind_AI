import { useEffect, useId, useMemo, useRef, useState } from "react";
import { avaliarRiscos, ROTULO_SEVERIDADE } from "../riscos/regras.js";
import { lerConfig } from "../riscos/config.js";
import { montarPacote, pacoteEmTexto } from "../coach/pacote.js";
import { montarPrompt, PROMPT_PENDENTE } from "../coach/prompt.js";
import { DECISOES_AGIR, PLANO_VAZIO, STATUS_FAZER, validarPlano } from "../coach/pdca.js";
import { fmtDataBr } from "./formatos.js";

const estiloCampo = { background: "var(--surface)", color: "var(--fg)", borderColor: "var(--line-strong)" };

/** Copia para a área de transferência, com plano B quando o navegador bloqueia a API. */
async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = texto;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

function BotaoCopiar({ texto, rotulo }) {
  const [estado, setEstado] = useState("");
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function aoClicar() {
    const ok = await copiarTexto(texto);
    setEstado(ok ? "Copiado." : "Não foi possível copiar. Selecione o texto e copie com Ctrl+C.");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setEstado(""), 4000);
  }

  return (
    <span className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={aoClicar}
        className="rounded-md px-3 py-1.5 text-sm font-medium"
        style={{ background: "var(--accent)", color: "var(--on-accent)" }}
      >
        {rotulo}
      </button>
      <span role="status" className="text-sm" style={{ color: "var(--muted)" }}>
        {estado}
      </span>
    </span>
  );
}

function Bloco({ id, titulo, descricao, acoes, children }) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-lg border p-4"
      style={{ background: "var(--surface)", borderColor: "var(--line)" }}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={id} className="text-base font-semibold">
            {titulo}
          </h3>
          {descricao && (
            <p className="max-w-3xl text-sm" style={{ color: "var(--muted)" }}>
              {descricao}
            </p>
          )}
        </div>
        {acoes}
      </div>
      {children}
    </section>
  );
}

function Texto({ texto, rotulo }) {
  return (
    <pre
      tabIndex={0}
      aria-label={rotulo}
      className="data max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md border p-3 text-xs"
      style={{ background: "var(--surface-2)", borderColor: "var(--line)" }}
    >
      {texto}
    </pre>
  );
}

function Campo({ rotulo, erro, children, id }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      {children}
      {erro && (
        <p id={`${id}-erro`} className="text-xs" style={{ color: "var(--risco-fg)" }}>
          {erro}
        </p>
      )}
    </div>
  );
}

function rotuloDoRisco(r) {
  const item = r.codigo === "R1" || r.codigo === "R2" ? `: ${r.itens[0]}` : "";
  return `${r.codigo} ${r.nome}${item} (severidade ${ROTULO_SEVERIDADE[r.severidade].toLowerCase()})`;
}

function FormularioPdca({ riscos, onAdicionar }) {
  const base = useId();
  const [plano, setPlano] = useState(PLANO_VAZIO);
  const [erros, setErros] = useState({});
  const [enviado, setEnviado] = useState(false);

  const muda = (campo) => (e) => {
    setPlano((p) => ({ ...p, [campo]: e.target.value }));
    setEnviado(false);
  };
  const idDe = (campo) => `${base}-${campo}`;
  const propsCampo = (campo, extra = {}) => ({
    id: idDe(campo),
    value: plano[campo],
    onChange: muda(campo),
    "aria-invalid": Boolean(erros[campo]),
    "aria-describedby": erros[campo] ? `${idDe(campo)}-erro` : undefined,
    className: "rounded-md border px-2 py-1.5 text-sm " + (extra.className ?? ""),
    style: { ...estiloCampo, borderColor: erros[campo] ? "var(--risco-line)" : "var(--line-strong)" },
  });

  function salvar(e) {
    e.preventDefault();
    const novosErros = validarPlano(plano);
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;
    const risco = riscos.find((r) => r.chave === plano.riscoChave);
    onAdicionar({ ...plano, risco: { codigo: risco.codigo, severidade: risco.severidade, rotulo: rotuloDoRisco(risco) } });
    setPlano(PLANO_VAZIO);
    setEnviado(true);
  }

  if (riscos.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Nenhum risco disparado para este time com os limites atuais, então não há o que planejar.
      </p>
    );
  }

  const legenda = "px-1 text-sm font-semibold";
  const caixa = "grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2";

  return (
    <form onSubmit={salvar} noValidate className="flex flex-col gap-4">
      <Campo id={idDe("riscoChave")} rotulo="Risco" erro={erros.riscoChave}>
        <select {...propsCampo("riscoChave")}>
          <option value="">Escolha um risco</option>
          {riscos.map((r) => (
            <option key={r.chave} value={r.chave}>
              {rotuloDoRisco(r)}
            </option>
          ))}
        </select>
      </Campo>

      <fieldset className={caixa} style={{ borderColor: "var(--line)" }}>
        <legend className={legenda}>Planejar</legend>
        <div className="sm:col-span-2">
          <Campo id={idDe("acao")} rotulo="Ação" erro={erros.acao}>
            <textarea rows={2} {...propsCampo("acao")} />
          </Campo>
        </div>
        <Campo id={idDe("responsavel")} rotulo="Responsável" erro={erros.responsavel}>
          <input type="text" {...propsCampo("responsavel")} />
        </Campo>
        <Campo id={idDe("prazo")} rotulo="Prazo" erro={erros.prazo}>
          <input type="date" {...propsCampo("prazo", { className: "data" })} />
        </Campo>
        <div className="sm:col-span-2">
          <Campo id={idDe("criterio")} rotulo="Critério de sucesso mensurável" erro={erros.criterio}>
            <input type="text" placeholder="Ex.: aging do item abaixo de 6 dias" {...propsCampo("criterio")} />
          </Campo>
        </div>
      </fieldset>

      <fieldset className={caixa} style={{ borderColor: "var(--line)" }}>
        <legend className={legenda}>Fazer</legend>
        <Campo id={idDe("statusFazer")} rotulo="Status">
          <select {...propsCampo("statusFazer")}>
            {STATUS_FAZER.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Campo>
      </fieldset>

      <fieldset className={caixa} style={{ borderColor: "var(--line)" }}>
        <legend className={legenda}>Checar</legend>
        <Campo id={idDe("metrica")} rotulo="Métrica a observar" erro={erros.metrica}>
          <input type="text" placeholder="Ex.: aging, WIP, Cycle Time P85" {...propsCampo("metrica")} />
        </Campo>
        <Campo id={idDe("dataChecagem")} rotulo="Data da checagem" erro={erros.dataChecagem}>
          <input type="date" {...propsCampo("dataChecagem", { className: "data" })} />
        </Campo>
      </fieldset>

      <fieldset className={caixa} style={{ borderColor: "var(--line)" }}>
        <legend className={legenda}>Agir</legend>
        <Campo id={idDe("decisaoAgir")} rotulo="Decisão após a checagem">
          <select {...propsCampo("decisaoAgir")}>
            <option value="">Decidir depois da checagem</option>
            {DECISOES_AGIR.map((d) => (
              <option key={d.valor} value={d.valor}>
                {d.rotulo}
              </option>
            ))}
          </select>
        </Campo>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="rounded-md px-3 py-1.5 text-sm font-medium"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          Salvar plano
        </button>
        {Object.keys(erros).length > 0 && (
          <p role="alert" className="text-sm" style={{ color: "var(--risco-fg)" }}>
            Corrija os campos indicados.
          </p>
        )}
        {enviado && (
          <p role="status" className="text-sm" style={{ color: "var(--ok-fg)" }}>
            Plano salvo. Ele aparece na lista abaixo.
          </p>
        )}
      </div>
    </form>
  );
}

function ListaPlanos({ planos, onAtualizar, onRemover }) {
  if (planos.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Nenhum plano salvo para este time. Os planos ficam só nesta página e somem ao recarregar.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {planos.map((p) => (
        <li
          key={p.id}
          className="flex flex-col gap-3 rounded-md border p-3"
          style={{ borderColor: "var(--line)", borderLeft: `6px solid ${p.risco.severidade === "alta" ? "var(--risco-line)" : "var(--warn-line)"}` }}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-semibold">{p.risco.rotulo}</p>
            <button
              type="button"
              onClick={() => onRemover(p.id)}
              className="rounded-md border px-2 py-1 text-xs font-medium"
              style={{ borderColor: "var(--line-strong)", color: "var(--fg)", background: "var(--surface)" }}
            >
              Remover plano
            </button>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <Par rotulo="Planejar: ação" valor={p.acao} />
            <Par rotulo="Responsável" valor={p.responsavel} />
            <Par rotulo="Prazo" valor={fmtDataBr(p.prazo)} />
            <Par rotulo="Critério de sucesso" valor={p.criterio} />
            <Par rotulo="Checar: métrica" valor={p.metrica} />
            <Par rotulo="Data da checagem" valor={fmtDataBr(p.dataChecagem)} />
          </dl>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium">Fazer</span>
              <select
                value={p.statusFazer}
                onChange={(e) => onAtualizar(p.id, { statusFazer: e.target.value })}
                className="rounded-md border px-2 py-1 text-sm"
                style={estiloCampo}
              >
                {STATUS_FAZER.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium">Agir</span>
              <select
                value={p.decisaoAgir}
                onChange={(e) => onAtualizar(p.id, { decisaoAgir: e.target.value })}
                className="rounded-md border px-2 py-1 text-sm"
                style={estiloCampo}
              >
                <option value="">Decidir depois da checagem</option>
                {DECISOES_AGIR.map((d) => (
                  <option key={d.valor} value={d.valor}>
                    {d.rotulo}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Par({ rotulo, valor }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-2">
      <dt className="shrink-0 sm:w-40" style={{ color: "var(--muted)" }}>
        {rotulo}
      </dt>
      <dd className="min-w-0 break-words">{valor}</dd>
    </div>
  );
}

export default function AgileCoach({
  time,
  itens,
  dataReferencia,
  textosRegras,
  origem,
  planos,
  onAdicionarPlano,
  onAtualizarPlano,
  onRemoverPlano,
}) {
  const { config } = useMemo(() => lerConfig(textosRegras), [textosRegras]);
  const riscos = useMemo(() => avaliarRiscos(itens, dataReferencia, config).riscos, [itens, dataReferencia, config]);
  const pacoteTexto = useMemo(
    () => pacoteEmTexto(montarPacote({ time, dataReferencia, itens, config, origem })),
    [time, dataReferencia, itens, config, origem]
  );
  const promptTexto = useMemo(() => montarPrompt(pacoteTexto), [pacoteTexto]);
  const planosDoTime = planos.filter((p) => p.time === time);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold leading-tight">Agile Coach</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {time} · referência em {fmtDataBr(dataReferencia)}
        </p>
        <p className="mt-1 max-w-3xl text-sm" style={{ color: "var(--muted)" }}>
          Nesta versão a IA roda fora do app: copie o prompt, cole no chat e confira a resposta contra os dados. O
          app não envia nada para lugar nenhum.
        </p>
      </div>

      <Bloco
        id="coach-pacote"
        titulo="1. Pacote de contexto"
        descricao="Só o que o app já calculou: métricas, limites usados, riscos disparados e linhas rejeitadas na importação."
        acoes={<BotaoCopiar texto={pacoteTexto} rotulo="Copiar pacote" />}
      >
        <Texto texto={pacoteTexto} rotulo="Pacote de contexto em JSON" />
      </Bloco>

      <Bloco
        id="coach-prompt"
        titulo="2. Prompt de análise"
        descricao="Texto fixo com o pacote já inserido no lugar de {{PACOTE_JSON}}."
        acoes={<BotaoCopiar texto={promptTexto} rotulo="Copiar prompt" />}
      >
        {PROMPT_PENDENTE && (
          <p
            role="status"
            className="mb-3 rounded-md border px-3 py-2 text-sm"
            style={{ background: "var(--warn-bg)", color: "var(--warn-fg)", borderColor: "var(--warn-line)" }}
          >
            O texto oficial do prompt ainda não foi cadastrado. O que aparece abaixo é provisório e só tem o pacote.
          </p>
        )}
        <Texto texto={promptTexto} rotulo="Prompt de análise com o pacote inserido" />
      </Bloco>

      <Bloco
        id="coach-pdca"
        titulo="3. Plano de ação PDCA"
        descricao="Escolha um risco e preencha Planejar, Fazer, Checar e Agir. Os planos ficam só nesta página."
      >
        <FormularioPdca riscos={riscos} onAdicionar={(p) => onAdicionarPlano({ ...p, time })} />
        <h4 className="mb-2 mt-6 text-base font-semibold">Planos de {time} ({planosDoTime.length})</h4>
        <ListaPlanos planos={planosDoTime} onAtualizar={onAtualizarPlano} onRemover={onRemoverPlano} />
      </Bloco>
    </div>
  );
}
