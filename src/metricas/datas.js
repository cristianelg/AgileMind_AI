/**
 * Datas como dias de calendário.
 *
 * Uma data "AAAA-MM-DD" vira um número inteiro de dias desde 1970-01-01,
 * calculado em UTC. Não usa fuso horário local nem a data atual do sistema,
 * então a diferença entre duas datas nunca perde ou ganha um dia.
 */

const FORMATO_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_POR_DIA = 86_400_000;

export function diaDoCalendario(iso) {
  const partes = FORMATO_ISO.exec(iso ?? "");
  if (!partes) {
    throw new Error(`Data inválida, esperado AAAA-MM-DD: ${iso}`);
  }
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const instante = Date.UTC(ano, mes - 1, dia);
  const volta = new Date(instante);
  // Rejeita datas que não existem, como 2026-02-31.
  if (
    volta.getUTCFullYear() !== ano ||
    volta.getUTCMonth() !== mes - 1 ||
    volta.getUTCDate() !== dia
  ) {
    throw new Error(`Data inexistente no calendário: ${iso}`);
  }
  return instante / MS_POR_DIA;
}

/** Dias corridos de inicioIso até fimIso (fim − início). */
export function diasEntre(inicioIso, fimIso) {
  return diaDoCalendario(fimIso) - diaDoCalendario(inicioIso);
}

/** Soma (ou subtrai, com n negativo) dias corridos a uma data AAAA-MM-DD. */
export function somarDias(iso, n) {
  return new Date((diaDoCalendario(iso) + n) * MS_POR_DIA).toISOString().slice(0, 10);
}
