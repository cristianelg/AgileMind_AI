import { somarDias } from "./datas.js";
import {
  bugsEmAndamento,
  cycleTime,
  detalharPercentil85,
  dispersaoCycleTime,
  filtrarPorTipo,
  inicioDoPeriodo,
  media,
  percentualWipBugs,
  throughput,
  throughputSemanal,
  wip,
} from "./metricas.js";

/**
 * Tudo o que o Dashboard Gerencial mostra, calculado só com o motor de métricas.
 * A interface apenas formata estes valores.
 *
 * Quais filtros valem para cada bloco:
 * - tipo: WIP, Cycle Time, throughput e gráficos. O cartão de bugs usa todos os tipos.
 * - período: Cycle Time e gráficos (itens concluídos no período). WIP e o throughput
 *   de 28 dias não seguem o período, porque WIP é uma foto da data de referência.
 */
export function calcularDashboard(
  itensDoTime,
  dataReferencia,
  { tipo = "todos", periodoDias = null, limiteWip = 5, janelaThroughput = 28 } = {}
) {
  const itens = filtrarPorTipo(itensDoTime, tipo);
  const desde = inicioDoPeriodo(dataReferencia, periodoDias);

  const wipAtual = wip(itens, dataReferencia);
  const dias = cycleTime(itens, dataReferencia, desde).map((c) => c.dias);
  const p85 = detalharPercentil85(dias);

  return {
    dataReferencia,
    periodo: { desde, fim: dataReferencia },
    wip: { valor: wipAtual, limite: limiteWip, acimaDoLimite: wipAtual > limiteWip },
    cycleTime: { n: dias.length, media: media(dias), p85: p85.valor },
    throughput: {
      valor: throughput(itens, dataReferencia, janelaThroughput),
      janelaDias: janelaThroughput,
      inicio: somarDias(dataReferencia, -(janelaThroughput - 1)),
      fim: dataReferencia,
    },
    bugs: {
      emAndamento: bugsEmAndamento(itensDoTime, dataReferencia),
      wipTotal: wip(itensDoTime, dataReferencia),
      percentual: percentualWipBugs(itensDoTime, dataReferencia),
    },
    semanal: throughputSemanal(itens, dataReferencia, desde),
    dispersao: dispersaoCycleTime(itens, dataReferencia, desde),
  };
}
