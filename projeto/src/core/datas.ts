/**
 * Datas como dias de calendário, sem fuso horário e sem relógio do sistema.
 * "AAAA-MM-DD" vira um inteiro de dias desde 1970-01-01, calculado em UTC.
 */

const FORMATO_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_POR_DIA = 86_400_000;

export function diaDoCalendario(iso: string | null | undefined): number {
  const partes = FORMATO_ISO.exec(iso ?? "");
  if (!partes) throw new Error(`Data inválida, esperado AAAA-MM-DD: ${iso}`);
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const instante = Date.UTC(ano, mes - 1, dia);
  const volta = new Date(instante);
  if (volta.getUTCFullYear() !== ano || volta.getUTCMonth() !== mes - 1 || volta.getUTCDate() !== dia) {
    throw new Error(`Data inexistente no calendário: ${iso}`);
  }
  return instante / MS_POR_DIA;
}

/** Dias corridos de inicioIso até fimIso (fim − início). */
export function diasEntre(inicioIso: string, fimIso: string): number {
  return diaDoCalendario(fimIso) - diaDoCalendario(inicioIso);
}

export function isoDoDia(dia: number): string {
  return new Date(dia * MS_POR_DIA).toISOString().slice(0, 10);
}

export function somarDias(iso: string, n: number): string {
  return isoDoDia(diaDoCalendario(iso) + n);
}

/** Segunda = 0 e domingo = 6. 1970-01-01 foi uma quinta-feira. */
export function diaDaSemana(iso: string): number {
  return (((diaDoCalendario(iso) + 3) % 7) + 7) % 7;
}

export function inicioDaSemana(iso: string): string {
  return somarDias(iso, -diaDaSemana(iso));
}
