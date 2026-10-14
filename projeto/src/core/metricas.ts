/**
 * Métricas de fluxo. Funções puras e determinísticas.
 *
 * - A data de referência (AAAA-MM-DD) é sempre parâmetro. Nada aqui lê o relógio.
 * - Nenhuma função aqui usa IA nem depende de interface.
 *
 * Definições:
 * - WIP: iniciado_em preenchido e sem concluido_em na data de referência.
 * - Cycle Time: concluido_em − iniciado_em, dias corridos.
 * - Lead Time: concluido_em − criado_em, dias corridos.
 * - Aging: data_referencia − iniciado_em dos itens em andamento.
 * - P85: nearest-rank, posição ⌈0,85 × n⌉ da lista ordenada.
 */

import { diaDoCalendario, diasEntre, inicioDaSemana, isoDoDia, somarDias } from "./datas";
import type { Item } from "./tipos";

export function emWip(item: Item, dataReferencia: string): boolean {
  if (!item.iniciado_em) return false;
  const ref = diaDoCalendario(dataReferencia);
  if (diaDoCalendario(item.iniciado_em) > ref) return false;
  return !item.concluido_em || diaDoCalendario(item.concluido_em) > ref;
}

export function itensEmWip(itens: Item[], dataReferencia: string): Item[] {
  return itens.filter((item) => emWip(item, dataReferencia));
}

export function wip(itens: Item[], dataReferencia: string): number {
  return itensEmWip(itens, dataReferencia).length;
}

function concluidoAte(item: Item, dataReferencia: string): boolean {
  return Boolean(item.concluido_em) && diaDoCalendario(item.concluido_em) <= diaDoCalendario(dataReferencia);
}

export interface PontoCycleTime {
  id: string;
  tipo: Item["tipo"];
  dias: number;
  concluidoEm: string;
}

/** Cycle Time por item concluído até a data de referência. Com `desde`, só itens concluídos nessa data ou depois. */
export function cycleTime(itens: Item[], dataReferencia: string, desde: string | null = null): PontoCycleTime[] {
  const limiteInferior = desde === null ? -Infinity : diaDoCalendario(desde);
  const resultado: PontoCycleTime[] = [];
  for (const item of itens) {
    if (!item.iniciado_em || !item.concluido_em) continue;
    if (!concluidoAte(item, dataReferencia)) continue;
    if (diaDoCalendario(item.concluido_em) < limiteInferior) continue;
    resultado.push({
      id: item.id,
      tipo: item.tipo,
      dias: diasEntre(item.iniciado_em, item.concluido_em),
      concluidoEm: item.concluido_em,
    });
  }
  return resultado;
}

export function leadTime(itens: Item[], dataReferencia: string): { id: string; dias: number }[] {
  const resultado: { id: string; dias: number }[] = [];
  for (const item of itens) {
    if (!item.concluido_em || !concluidoAte(item, dataReferencia)) continue;
    resultado.push({ id: item.id, dias: diasEntre(item.criado_em, item.concluido_em) });
  }
  return resultado;
}

export function aging(itens: Item[], dataReferencia: string): { id: string; dias: number }[] {
  const resultado: { id: string; dias: number }[] = [];
  for (const item of itensEmWip(itens, dataReferencia)) {
    if (item.iniciado_em) resultado.push({ id: item.id, dias: diasEntre(item.iniciado_em, dataReferencia) });
  }
  return resultado;
}

/** Itens concluídos nos janelaDias dias corridos que terminam na data de referência, incluindo-a. */
export function itensConcluidosNaJanela(itens: Item[], dataReferencia: string, janelaDias: number): Item[] {
  const fim = diaDoCalendario(dataReferencia);
  const inicio = diaDoCalendario(somarDias(dataReferencia, -(janelaDias - 1)));
  return itens.filter((item) => {
    if (!item.concluido_em) return false;
    const dia = diaDoCalendario(item.concluido_em);
    return dia >= inicio && dia <= fim;
  });
}

export function throughput(itens: Item[], dataReferencia: string, janelaDias: number): number {
  return itensConcluidosNaJanela(itens, dataReferencia, janelaDias).length;
}

export function media(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return valores.reduce((soma, v) => soma + v, 0) / valores.length;
}

export interface DetalheP85 {
  n: number;
  ordenados: number[];
  posicao: number | null;
  valor: number | null;
}

/** P85 nearest-rank. posição = ⌈0,85 × n⌉ = ⌊(85n + 99) / 100⌋, em inteiros, sem erro de ponto flutuante. */
export function detalharPercentil85(valores: number[]): DetalheP85 {
  const ordenados = [...valores].sort((a, b) => a - b);
  const n = ordenados.length;
  if (n === 0) return { n: 0, ordenados, posicao: null, valor: null };
  const posicao = Math.floor((85 * n + 99) / 100);
  return { n, ordenados, posicao, valor: ordenados[posicao - 1] ?? null };
}

export function percentil85(valores: number[]): number | null {
  return detalharPercentil85(valores).valor;
}

export function bugsEmAndamento(itens: Item[], dataReferencia: string): number {
  return itensEmWip(itens, dataReferencia).filter((item) => item.tipo === "bug").length;
}

export function percentualWipBugs(itens: Item[], dataReferencia: string): number | null {
  const total = wip(itens, dataReferencia);
  return total === 0 ? null : (bugsEmAndamento(itens, dataReferencia) / total) * 100;
}

export interface SemanaThroughput {
  inicio: string;
  fim: string;
  total: number;
  parcial: boolean;
}

/** Throughput por semana (segunda a domingo), incluindo semanas com total 0. */
export function throughputSemanal(itens: Item[], dataReferencia: string, desde: string | null = null): SemanaThroughput[] {
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

  const semanas: SemanaThroughput[] = [];
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
