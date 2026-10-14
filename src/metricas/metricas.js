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

import { diaDoCalendario, diasEntre, inicioDaSemana, isoDoDia, somarDias } from "./datas.js";

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

/**
 * Cycle Time por item concluído até a data de referência.
 * Com `desde` (AAAA-MM-DD), só entram itens concluídos nessa data ou depois.
 * Devolve [{ id, tipo, dias, concluidoEm }].
 */
export function cycleTime(itens, dataReferencia, desde = null) {
  const limiteInferior = desde === null ? -Infinity : diaDoCalendario(desde);
  return itens
    .filter(
      (item) =>
        item.iniciado_em &&
        concluidoAte(item, dataReferencia) &&
        diaDoCalendario(item.concluido_em) >= limiteInferior
    )
    .map((item) => ({
      id: item.id,
      tipo: item.tipo,
      dias: diasEntre(item.iniciado_em, item.concluido_em),
      concluidoEm: item.concluido_em,
    }));
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

// ---------------------------------------------------------------------------
// Filtros e métricas do Dashboard Gerencial
// ---------------------------------------------------------------------------

/** Filtra por tipo ("história" ou "bug"). "todos" ou vazio não filtra. */
export function filtrarPorTipo(itens, tipo) {
  return !tipo || tipo === "todos" ? itens : itens.filter((item) => item.tipo === tipo);
}

/**
 * Primeiro dia de um período de periodoDias dias corridos que termina na data
 * de referência, incluindo-a. periodoDias nulo significa sem limite inferior.
 */
export function inicioDoPeriodo(dataReferencia, periodoDias) {
  return periodoDias === null || periodoDias === undefined
    ? null
    : somarDias(dataReferencia, -(periodoDias - 1));
}

/** Bugs em andamento: itens em WIP com tipo "bug". */
export function bugsEmAndamento(itens, dataReferencia) {
  return itensEmWip(itens, dataReferencia).filter((item) => item.tipo === "bug").length;
}

/** Percentual do WIP ocupado por bugs (0 a 100). Nulo quando o WIP é zero. */
export function percentualWipBugs(itens, dataReferencia) {
  const total = wip(itens, dataReferencia);
  return total === 0 ? null : (bugsEmAndamento(itens, dataReferencia) / total) * 100;
}

/**
 * Throughput por semana (segunda a domingo): [{ inicio, fim, total, parcial }].
 * Inclui semanas sem conclusões, com total 0. `parcial` marca a semana que
 * começa antes do período ou termina depois da data de referência.
 * Sem `desde`, a série começa na semana da primeira conclusão.
 */
export function throughputSemanal(itens, dataReferencia, desde = null) {
  const ref = diaDoCalendario(dataReferencia);
  const limiteInferior = desde === null ? -Infinity : diaDoCalendario(desde);
  const concluidos = itens
    .filter((item) => item.concluido_em)
    .map((item) => diaDoCalendario(item.concluido_em))
    .filter((dia) => dia <= ref && dia >= limiteInferior);

  let inicioBusca = desde;
  if (inicioBusca === null) {
    if (concluidos.length === 0) return [];
    inicioBusca = isoDoDia(Math.min(...concluidos));
  }

  const semanas = [];
  const ultima = diaDoCalendario(inicioDaSemana(dataReferencia));
  for (let ini = diaDoCalendario(inicioDaSemana(inicioBusca)); ini <= ultima; ini += 7) {
    const fim = ini + 6;
    semanas.push({
      inicio: isoDoDia(ini),
      fim: isoDoDia(fim),
      total: concluidos.filter((dia) => dia >= ini && dia <= fim).length,
      parcial: (desde !== null && ini < limiteInferior) || fim > ref,
    });
  }
  return semanas;
}

/**
 * Pontos do gráfico de dispersão: um por item concluído, ordenados por data.
 * [{ id, tipo, dias, concluidoEm, dia }], com `dia` como dia de calendário.
 */
export function dispersaoCycleTime(itens, dataReferencia, desde = null) {
  return cycleTime(itens, dataReferencia, desde)
    .map((c) => ({ ...c, dia: diaDoCalendario(c.concluidoEm) }))
    .sort((a, b) => a.dia - b.dia || a.id.localeCompare(b.id));
}
