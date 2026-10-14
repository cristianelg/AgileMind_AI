import { useId, useRef, useState } from "react";
import { COLUNAS_MODELO } from "../dados/validarCsv.js";

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/**
 * Importação de CSV por arquivo ou texto colado. Quem valida e guarda os dados é o App;
 * aqui só ficam a entrada e o relatório, com toda linha recusada listada.
 */
export default function ImportarCsv({
  relatorio,
  origemDemo,
  nomeEmUso,
  dataReferencia,
  onDataReferencia,
  onImportar,
  onRestaurar,
}) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [lendo, setLendo] = useState(false);
  const idPainel = useId();
  const inputArquivo = useRef(null);

  async function aoEscolherArquivo(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setLendo(true);
    try {
      onImportar(await arquivo.text(), arquivo.name);
    } catch {
      onImportar(null, arquivo.name);
    } finally {
      setLendo(false);
      e.target.value = "";
    }
  }

  const r = relatorio?.resultado;

  return (
    <section
      className="mb-4 rounded-lg border"
      style={{ background: "var(--surface)", borderColor: "var(--line)" }}
      aria-label="Importar dados"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Dados do time</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {origemDemo ? "Usando o CSV de exemplo (dados demonstrativos)." : `Usando o CSV importado: ${nomeEmUso}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-expanded={aberto}
            aria-controls={idPainel}
            onClick={() => setAberto((v) => !v)}
            className="rounded-md border px-3 py-1.5 text-sm font-medium"
            style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--surface)" }}
          >
            {aberto ? "Fechar importação" : "Importar CSV"}
          </button>
          <button
            type="button"
            onClick={() => {
              setTexto("");
              onRestaurar();
            }}
            disabled={origemDemo && !relatorio}
            className="rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            style={{ borderColor: "var(--line-strong)", color: "var(--fg)", background: "var(--surface)" }}
          >
            Restaurar demonstração
          </button>
        </div>
      </div>

      {aberto && (
        <div id={idPainel} className="flex flex-col gap-4 border-t px-4 py-4" style={{ borderColor: "var(--line)" }}>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Colunas esperadas, nesta ordem ou em outra: <span className="data text-xs">{COLUNAS_MODELO.join(", ")}</span>.
            Datas em AAAA-MM-DD, bloqueado e adicionado_apos_inicio com sim ou nao. Aceita vírgula ou ponto e vírgula, em UTF-8.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="arquivo-csv"
              className="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              {lendo ? "Lendo..." : "Escolher arquivo CSV"}
            </label>
            <input
              id="arquivo-csv"
              ref={inputArquivo}
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={aoEscolherArquivo}
              className="sr-only"
            />
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              ou cole o texto abaixo
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="texto-csv" className="text-sm font-medium">
              Texto do CSV
            </label>
            <textarea
              id="texto-csv"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={6}
              spellCheck={false}
              placeholder={COLUNAS_MODELO.join(",")}
              className="data w-full rounded-md border p-2 text-xs"
              style={{ background: "var(--surface)", color: "var(--fg)", borderColor: "var(--line-strong)" }}
            />
            <div>
              <button
                type="button"
                onClick={() => onImportar(texto, "texto colado")}
                disabled={texto.trim() === ""}
                className="rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}
              >
                Importar texto colado
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="data-referencia" className="text-sm font-medium">
              Data de referência dos cálculos
            </label>
            <input
              id="data-referencia"
              type="date"
              value={dataReferencia}
              onChange={(e) => e.target.value && onDataReferencia(e.target.value)}
              className="data rounded-md border px-2 py-1 text-sm"
              style={{ background: "var(--surface)", color: "var(--fg)", borderColor: "var(--line-strong)" }}
            />
          </div>
        </div>
      )}

      {relatorio && (
        <div className="border-t px-4 py-4" style={{ borderColor: "var(--line)" }}>
          {relatorio.leituraFalhou ? (
            <p role="alert" className="text-sm font-medium" style={{ color: "var(--risco-fg)" }}>
              Não foi possível ler o arquivo {relatorio.nome}. Os dados anteriores foram mantidos.
            </p>
          ) : (
            <>
              <p
                role={relatorio.aplicado ? "status" : "alert"}
                className="text-sm font-medium"
                style={{ color: relatorio.aplicado ? "var(--fg)" : "var(--risco-fg)" }}
              >
                {r.erro
                  ? `${r.erro} Nada foi importado, os dados anteriores foram mantidos.`
                  : relatorio.aplicado
                    ? `Importado de ${relatorio.nome}: ${plural(r.itens.length, "linha válida", "linhas válidas")} de ${r.total}, ${plural(r.invalidas.length, "recusada", "recusadas")}.`
                    : `${r.total === 1 ? "A única linha não é válida" : `Nenhuma das ${r.total} linhas é válida`}. Os dados anteriores foram mantidos.`}
              </p>
              {relatorio.avisos.map((a) => (
                <p key={a} className="mt-1 text-sm" style={{ color: "var(--warn-fg)" }}>
                  {a}
                </p>
              ))}
              {r.ignoradas.length > 0 && (
                <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                  Colunas fora do modelo, ignoradas: {r.ignoradas.join(", ")}.
                </p>
              )}
              {r.invalidas.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-sm" style={{ color: "var(--muted)" }}>
                    Estas linhas ficaram fora dos cálculos. Corrija no arquivo e importe de novo.
                  </p>
                  <div className="overflow-x-auto rounded-md border" style={{ borderColor: "var(--line)" }}>
                    <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                      <caption className="sr-only">Linhas recusadas na importação</caption>
                      <thead>
                        <tr style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium">Linha</th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium">ID</th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium">Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.invalidas.map((l) => (
                          <tr key={l.linha} style={{ borderTop: "1px solid var(--line)" }}>
                            <td className="data px-3 py-2 align-top">{l.linha}</td>
                            <td className="data whitespace-nowrap px-3 py-2 align-top">{l.id ?? "—"}</td>
                            <td className="px-3 py-2">
                              {l.motivos.length === 1 ? (
                                l.motivos[0]
                              ) : (
                                <ul className="list-disc pl-4">
                                  {l.motivos.map((m) => (
                                    <li key={m}>{m}</li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
