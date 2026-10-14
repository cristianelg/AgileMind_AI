import { useId, useState } from "react";

/**
 * Cartão de métrica. O botão "?" abre a fórmula usada, para conferência.
 * `ajuda` é uma lista de frases. `alerta` destaca o cartão (borda e selo).
 */
export default function CartaoMetrica({ titulo, ajuda, alerta = false, selo = null, children }) {
  const [aberta, setAberta] = useState(false);
  const idAjuda = useId();

  return (
    <article
      className="flex min-w-0 flex-col gap-3 rounded-lg border p-4"
      style={{
        background: "var(--surface)",
        borderColor: alerta ? "var(--risco-line)" : "var(--line)",
        boxShadow: alerta ? "inset 0 0 0 1px var(--risco-line)" : "none",
      }}
    >
      <header className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          {titulo}
        </h3>
        <button
          type="button"
          aria-expanded={aberta}
          aria-controls={idAjuda}
          aria-label={`Como é calculado: ${titulo}`}
          onClick={() => setAberta((v) => !v)}
          className="data flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium"
          style={{
            borderColor: aberta ? "var(--accent)" : "var(--line)",
            color: aberta ? "var(--accent)" : "var(--muted)",
            background: aberta ? "var(--accent-soft)" : "var(--surface)",
          }}
        >
          ?
        </button>
      </header>

      {children}
      {selo}

      <div
        id={idAjuda}
        role="note"
        hidden={!aberta}
        className="flex flex-col gap-1.5 rounded-md p-3 text-xs"
        style={{ background: "var(--accent-soft)", color: "var(--fg)" }}
      >
        {ajuda.map((frase) => (
          <p key={frase}>{frase}</p>
        ))}
      </div>
    </article>
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
