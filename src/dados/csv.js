import csvDemo from "../../dados/itens_demo.csv?raw";

/**
 * Converte o texto CSV em lista de objetos.
 * Células vazias viram null e story_points vira número.
 * Parser simples: o modelo de dados não tem vírgulas dentro de campos.
 */
export function parseCsv(texto) {
  const [cabecalho, ...linhas] = texto.trim().split(/\r?\n/);
  const colunas = cabecalho.split(",");
  return linhas.map((linha) => {
    const celulas = linha.split(",");
    const obj = {};
    colunas.forEach((col, i) => {
      const v = (celulas[i] ?? "").trim();
      obj[col] = v === "" ? null : v;
    });
    obj.story_points = obj.story_points === null ? null : Number(obj.story_points);
    return obj;
  });
}

// Dados demonstrativos. Estado em memória, sem armazenamento do navegador.
export const ITENS_DEMO = parseCsv(csvDemo);
export const TIMES = [...new Set(ITENS_DEMO.map((i) => i.time))];
