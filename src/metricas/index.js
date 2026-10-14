import {
  aging,
  cycleTime,
  detalharPercentil85,
  itensConcluidosNaJanela,
  itensEmWip,
  leadTime,
  media,
} from "./metricas.js";
import { somarDias } from "./datas.js";

export * from "./metricas.js";
export * from "./datas.js";

/**
 * Calcula todas as métricas de um time e devolve também os valores por item,
 * para a conferência manual. Continua puro: tudo depende só dos argumentos.
 */
export function calcularTime(itens, dataReferencia, janelaDias = 28) {
  const emAndamento = itensEmWip(itens, dataReferencia);
  const cycleTimes = cycleTime(itens, dataReferencia);
  const leadTimes = leadTime(itens, dataReferencia);
  const agings = aging(itens, dataReferencia);
  const naJanela = itensConcluidosNaJanela(itens, dataReferencia, janelaDias);

  const cycleTimeP85 = detalharPercentil85(cycleTimes.map((c) => c.dias));
  const porId = (lista) => new Map(lista.map((x) => [x.id, x.dias]));
  const cycleDe = porId(cycleTimes);
  const leadDe = porId(leadTimes);
  const agingDe = porId(agings);
  const idsWip = new Set(emAndamento.map((i) => i.id));
  const idsJanela = new Set(naJanela.map((i) => i.id));

  return {
    dataReferencia,
    janelaDias,
    janela: {
      inicio: somarDias(dataReferencia, -(janelaDias - 1)),
      fim: dataReferencia,
    },
    wip: emAndamento.length,
    idsWip: emAndamento.map((i) => i.id),
    cycleTimes,
    cycleTimeMedio: media(cycleTimes.map((c) => c.dias)),
    cycleTimeP85,
    leadTimes,
    leadTimeMedio: media(leadTimes.map((l) => l.dias)),
    agings,
    throughput: naJanela.length,
    idsThroughput: naJanela.map((i) => i.id),
    linhas: itens.map((item) => ({
      item,
      emWip: idsWip.has(item.id),
      cycleTime: cycleDe.get(item.id) ?? null,
      leadTime: leadDe.get(item.id) ?? null,
      aging: agingDe.get(item.id) ?? null,
      naJanela: idsJanela.has(item.id),
    })),
  };
}
