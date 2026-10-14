/** Formatação em português do Brasil, usada nos textos das regras de risco. */

export function fmtNum(n: number | null | undefined, casas = 1): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: casas });
}

/** "2026-10-13" vira "13/10/2026". */
export function fmtDataBr(iso: string | null | undefined): string {
  return iso ? iso.split("-").reverse().join("/") : "—";
}
