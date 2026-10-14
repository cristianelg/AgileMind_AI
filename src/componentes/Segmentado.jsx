import { useId } from "react";

/**
 * Controle segmentado feito com botões de rádio nativos: o teclado (setas, Tab)
 * e os leitores de tela funcionam sem código extra.
 */
export default function Segmentado({ nome, rotulo, valor, opcoes, onChange }) {
  const idRotulo = useId();
  return (
    <div className="flex items-center gap-2">
      <span id={idRotulo} className="text-sm font-medium" style={{ color: "var(--muted)" }}>
        {rotulo}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={idRotulo}
        className="inline-flex overflow-hidden rounded-md border"
        style={{ borderColor: "var(--line-strong)", background: "var(--surface)" }}
      >
        {opcoes.map((opcao, i) => (
          <label key={opcao.valor} className="relative cursor-pointer">
            <input
              type="radio"
              name={nome}
              value={opcao.valor}
              checked={valor === opcao.valor}
              onChange={() => onChange(opcao.valor)}
              className="peer sr-only"
            />
            <span
              className="block whitespace-nowrap px-3 py-1.5 text-sm font-medium text-[var(--fg)] peer-checked:bg-[var(--accent)] peer-checked:text-[var(--on-accent)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-[var(--fg)]"
              style={{ borderLeft: i === 0 ? "none" : "1px solid var(--line)" }}
            >
              {opcao.rotulo}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
