/**
 * Converte o texto CSV em lista de objetos.
 * Células vazias viram null e story_points vira número.
 * Parser simples: o modelo de dados não tem vírgulas dentro de campos.
 * Fica separado de csv.js porque este arquivo roda também fora do Vite (testes).
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
