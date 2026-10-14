import type { Item } from "./tipos";

/**
 * Converte o texto CSV em itens, sem validar. Usado nos testes e na carga de dados de exemplo.
 * A importação de verdade deve passar por validação linha a linha antes de gravar no banco.
 * Parser simples: o modelo de dados de exemplo não tem vírgulas dentro de campos.
 */
export function parseCsv(texto: string): Item[] {
  const [cabecalho, ...linhas] = texto.trim().split(/\r?\n/);
  const colunas = (cabecalho ?? "").split(",");
  return linhas.map((linha) => {
    const celulas = linha.split(",");
    const obj: Record<string, string | number | null> = {};
    colunas.forEach((col, i) => {
      const v = (celulas[i] ?? "").trim();
      obj[col] = v === "" ? null : v;
    });
    obj["story_points"] = obj["story_points"] === null ? null : Number(obj["story_points"]);
    return obj as unknown as Item;
  });
}
