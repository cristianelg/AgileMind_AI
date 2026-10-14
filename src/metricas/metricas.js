/**
 * Métricas de fluxo. Funções puras e determinísticas.
 *
 * Regras deste módulo:
 * - A data de referência (AAAA-MM-DD) é sempre parâmetro. Nada aqui lê o relógio.
 * - Cada função recebe a lista de itens (objetos do CSV) e devolve dados,
 *   nunca texto interpretado e nunca resultado de IA.
 *
 * Definições (instruções do Projeto):
 * - WIP: iniciado_em preenchido e sem concluido_em na data de referência.
 * - Cycle Time: concluido_em − iniciado_em, dias corridos.
 * - Lead Time: concluido_em − criado_em, dias corridos.
 * - Aging: data_referencia − iniciado_em dos itens em andamento.
 * - P85: nearest-rank, posição ⌈0,85 × n⌉ da lista ordenada.
 */

import { diaDoCalendario, diasEntre, somarDias } from "./datas.js";

/**
 * Item em WIP na data de referência: já iniciado até ela e ainda sem conclusão.
 * Um item concluído depois da data de referência ainda estava em WIP nela.
 */
export function emWip(item, dataReferencia) {
  if (!item.iniciado_em) return false;
  const ref = diaDoCalendario(dataReferencia);
  if (diaDoCalendario(item.iniciado_em) > ref) return false;
  return !item.concluido_em || diaDoCalendario(item.concluido_em) > ref;
}

export function itensEmWip(itens, dataReferencia) {
  return itens.filter((item) => emWip(item, dataReferencia));
}

/** WIP: quantidade de itens em andamento na data de referência. */
export function wip(itens, dataReferencia) {
  return itensEmWip(itens, dataReferencia).length;
}

function concluidoAte(item, dataReferencia) {
  return Boolean(item.concluido_em) && diaDoCalendario(item.concluido_em) <= diaDoCalendario(dataReferencia);
}

/** Cycle Time por item concluído até a data de referência: [{ id, dias }]. */
export function cycleTime(itens, dataReferencia) {
  return itens
    .filter((item) => item.iniciado_em && concluidoAte(item, dataReferencia))
    .map((item) => ({ id: item.id, dias: diasEntre(item.iniciado_em, item.concluido_em) }));
}

/** Lead Time por item concluído até a data de referência: [{ id, dias }]. */
export function leadTime(itens, dataReferencia) {
  return itens
    .filter((item) => item.criado_em && concluidoAte(item, dataReferencia))
    .map((item) => ({ id: item.id, dias: diasEntre(item.criado_em, item.concluido_em) }));
}

/** Aging de cada item em WIP: [{ id, dias }]. */
export function aging(itens, dataReferencia) {
  return itensEmWip(itens, dataReferencia).map((item) => ({
    id: item.id,
    dias: diasEntre(item.iniciado_em, dataReferencia),
  }));
}

/**
 * Itens concluídos na janela de janelaDias dias corridos que termina na data
 * de referência, incluindo-a. Com janelaDias = 28 e referência 2026-10-13, a
 * janela vai de 2026-09-16 a 2026-10-13.
 */
export function itensConcluidosNaJanela(itens, dataReferencia, janelaDias) {
  const fim = diaDoCalendario(dataReferencia);
  const inicio = diaDoCalendario(somarDias(dataReferencia, -(janelaDias - 1)));
  return itens.filter((item) => {
    if (!item.concluido_em) return false;
    const dia = diaDoCalendario(item.concluido_em);
    return dia >= inicio && dia <= fim;
  });
}

/** Throughput: itens concluídos na janela de janelaDias dias. */
export function throughput(itens, dataReferencia, janelaDias) {
  return itensConcluidosNaJanela(itens, dataReferencia, janelaDias).length;
}

/** Média simples. Devolve null para lista vazia. */
export function media(valores) {
  if (valores.length === 0) return null;
  return valores.reduce((soma, v) => soma + v, 0) / valores.length;
}

/**
 * P85 por nearest-rank, com o passo a passo.
 * posição = ⌈0,85 × n⌉, calculada em inteiros: ⌈85n/100⌉ = ⌊(85n + 99) / 100⌋.
 * Isso evita erro de ponto flutuante em casos como 0,85 × 20.
 */
export function detalharPercentil85(valores) {
  const ordenados = [...valores].sort((a, b) => a - b);
  const n = ordenados.length;
  if (n === 0) return { n: 0, ordenados, posicao: null, valor: null };
  const posicao = Math.floor((85 * n + 99) / 100);
  return { n, ordenados, posicao, valor: ordenados[posicao - 1] };
}

/** P85 de uma lista de números. Não depende de data. */
export function percentil85(valores) {
  return detalharPercentil85(valores).valor;
}
