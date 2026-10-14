import { fmtDataBr, fmtItens } from "./formatos.js";

const COLUNAS = [
  { chave: "id", titulo: "ID" },
  { chave: "tipo", titulo: "Tipo" },
  { chave: "titulo", titulo: "Título" },
  { chave: "status", titulo: "Status" },
  { chave: "criado_em", titulo: "Criado em", data: true },
  { chave: "iniciado_em", titulo: "Iniciado em", data: true },
  { chave: "concluido_em", titulo: "Concluído em", data: true },
  { chave: "bloqueado", titulo: "Bloqueado" },
  { chave: "bloqueado_desde", titulo: "Bloqueado desde", data: true },
  { chave: "story_points", titulo: "Pontos", numero: true },
  { chave: "adicionado_apos_inicio", titulo: "Adicionado após início" },
];

const simNao = (v) => (v === "sim" ? "sim" : "não");

function Celula({ coluna, item }) {
  const valor = item[coluna.chave];
  switch (coluna.chave) {
    case "id":
      return (
        <span className="data text-xs" style={{ color: "var(--accent)" }}>
          {valor}
        </span>
      );
    case "tipo":
      return (
        <span>
          <span aria-hidden="true" style={{ color: valor === "bug" ? "var(--bug)" : "var(--accent)" }}>
            {valor === "bug" ? "◆" : "●"}
          </span>{" "}
          {valor}
        </span>
      );
    case "bloqueado":
      return valor === "sim" ? (
        <span className="font-semibold" style={{ color: "var(--risco-fg)" }}>
          sim
        </span>
      ) : (
        "não"
      );
    case "adicionado_apos_inicio":
      return simNao(valor);
    case "criado_em":
    case "iniciado_em":
    case "concluido_em":
    case "bloqueado_desde":
      return fmtDataBr(valor);
    default:
      return valor ?? "—";
  }
}

export default function TabelaItens({ time, itens }) {
  return (
    <details
      open
      className="group mt-6 rounded-lg border"
      style={{ background: "var(--surface)", borderColor: "var(--line)" }}
    >
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4">
        <span className="min-w-0">
          <h2 className="inline text-base font-semibold">Itens do time</h2>
          <span className="ml-2 text-sm" style={{ color: "var(--muted)" }}>
            {time} · {fmtItens(itens.length)}
          </span>
        </span>
        <span className="shrink-0 text-xs font-medium" style={{ color: "var(--accent)" }}>
          <span className="group-open:hidden">Mostrar tabela</span>
          <span className="hidden group-open:inline">Ocultar tabela</span>
        </span>
      </summary>

      <div className="overflow-x-auto border-t" style={{ borderColor: "var(--line)" }}>
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
              {COLUNAS.map((c) => (
                <th
                  key={c.chave}
                  scope="col"
                  className={"whitespace-nowrap px-3 py-2 text-xs font-medium " + (c.numero ? "text-right" : "text-left")}
                >
                  {c.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id} style={{ borderTop: "1px solid var(--line)" }}>
                {COLUNAS.map((c) => (
                  <td
                    key={c.chave}
                    className={
                      "whitespace-nowrap px-3 py-2 tabular-nums " +
                      (c.numero ? "text-right " : "") +
                      (c.data ? "text-[13px]" : "")
                    }
                  >
                    <Celula coluna={c} item={item} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
