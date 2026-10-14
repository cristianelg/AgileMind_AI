import { useEffect, useId, useRef, useState } from "react";

/**
 * Célula da faixa de indicadores. O "?" abre a fórmula usada em um balão
 * que fecha com Esc, com um clique fora ou ao clicar de novo no "?".
 * `escopo` diz, na própria célula, o que o filtro faz ou não com ela.
 */
export default function Indicador({ titulo, ajuda, escopo, fundo = "var(--surface)", children, className = "" }) {
  const [aberta, setAberta] = useState(false);
  const idAjuda = useId();
  const raiz = useRef(null);
  const botao = useRef(null);

  useEffect(() => {
    if (!aberta) return undefined;
    const aoClicarFora = (e) => {
      if (raiz.current && !raiz.current.contains(e.target)) setAberta(false);
    };
    const aoTeclar = (e) => {
      if (e.key === "Escape") {
        setAberta(false);
        botao.current?.focus();
      }
    };
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberta]);

  return (
    <section
      ref={raiz}
      aria-label={titulo}
      style={{ background: fundo }}
      className={"relative flex min-w-0 flex-col gap-3 p-5 " + className}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          {titulo}
        </h3>
        <button
          ref={botao}
          type="button"
          aria-expanded={aberta}
          aria-controls={aberta ? idAjuda : undefined}
          aria-label={`Como é calculado: ${titulo}`}
          onClick={() => setAberta((v) => !v)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold"
          style={{
            borderColor: aberta ? "var(--accent)" : "var(--line-strong)",
            color: aberta ? "var(--on-accent)" : "var(--muted)",
            background: aberta ? "var(--accent)" : "var(--surface)",
          }}
        >
          ?
        </button>
      </div>

      {aberta && (
        <div
          id={idAjuda}
          role="note"
          className="absolute right-3 top-12 z-30 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-1.5 rounded-md border p-3 text-xs shadow-lg"
          style={{ background: "var(--surface)", borderColor: "var(--line-strong)", color: "var(--fg)" }}
        >
          {ajuda.map((frase) => (
            <p key={frase}>{frase}</p>
          ))}
        </div>
      )}

      {children}

      {escopo && (
        <p className="mt-auto text-xs" style={{ color: "var(--muted)" }}>
          {escopo}
        </p>
      )}
    </section>
  );
}

export function Selo({ tipo, children }) {
  const cores =
    tipo === "alerta"
      ? { background: "var(--risco-bg)", color: "var(--risco-fg)" }
      : { background: "var(--ok-bg)", color: "var(--ok-fg)" };
  return (
    <p className="inline-flex w-fit items-center gap-1.5 rounded px-2 py-1 text-xs font-medium" style={cores}>
      <span aria-hidden="true">{tipo === "alerta" ? "▲" : "●"}</span>
      {children}
    </p>
  );
}
