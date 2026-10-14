// Formatação em português do Brasil: vírgula decimal e datas dd/MM.

export function fmtNum(n, casas = 1) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: casas });
}

/** "2026-10-13" vira "13/10/2026". */
export function fmtDataBr(iso) {
  return iso ? iso.split("-").reverse().join("/") : "—";
}

/** "2026-10-13" vira "13/10". */
export function fmtDiaMes(iso) {
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—";
}

export function fmtItens(n) {
  return `${n} ${n === 1 ? "item" : "itens"}`;
}
