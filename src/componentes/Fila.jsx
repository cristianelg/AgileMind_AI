/**
 * Filas de blocos, como a coluna de um quadro Kanban: um bloco por item.
 * São apoio visual. O texto ao lado diz os mesmos números, por isso ficam ocultas
 * para leitores de tela.
 */

const ESTILOS = {
  acento: { background: "var(--accent)" },
  risco: { background: "var(--risco-line)" },
  bug: { background: "var(--bug)" },
  neutro: { background: "var(--bloco)" },
  livre: { border: "1.5px dashed var(--line-strong)" },
};

const MAXIMO_DE_BLOCOS = 40;

function Blocos({ tipo, quantidade }) {
  return Array.from({ length: quantidade }, (_, i) => (
    <span key={`${tipo}-${i}`} className="block h-7 w-4 shrink-0 rounded-[3px]" style={ESTILOS[tipo]} />
  ));
}

/**
 * WIP contra o limite. Blocos cheios dentro do limite, vagas livres tracejadas,
 * uma linha no limite e, depois dela, os itens que passam do limite em vermelho.
 */
export function FilaWip({ wip, limite }) {
  if (limite > MAXIMO_DE_BLOCOS || wip > MAXIMO_DE_BLOCOS) return null;
  const dentro = Math.min(wip, limite);
  const livres = limite - dentro;
  const excesso = Math.max(wip - limite, 0);
  return (
    <div aria-hidden="true" className="flex flex-wrap items-center gap-1">
      <Blocos tipo="acento" quantidade={dentro} />
      <Blocos tipo="livre" quantidade={livres} />
      <span className="mx-1 h-9 border-l-2 border-dashed" style={{ borderColor: "var(--fg)" }} />
      <Blocos tipo="risco" quantidade={excesso} />
    </div>
  );
}

/** Bugs dentro do WIP: um bloco por item em andamento, os bugs em laranja. */
export function FilaBugs({ total, bugs }) {
  if (total === 0 || total > MAXIMO_DE_BLOCOS) return null;
  return (
    <div aria-hidden="true" className="flex flex-wrap items-center gap-1">
      <Blocos tipo="bug" quantidade={bugs} />
      <Blocos tipo="neutro" quantidade={total - bugs} />
    </div>
  );
}
