/**
 * Pacote de contexto para a análise externa. Função pura, sem IA.
 *
 * Reúne só o que o app já calculou: métricas do motor, limites usados, riscos disparados
 * (regra, severidade, evidência) e linhas rejeitadas na importação. Não inclui interpretação.
 * A data de referência é parâmetro e não há carimbo de data/hora, para o pacote ser
 * reproduzível: os mesmos dados e os mesmos limites geram exatamente o mesmo JSON.
 */

import { calcularDashboard } from "../metricas/dashboard.js";
import { aging, leadTime, media } from "../metricas/metricas.js";
import { itensEmWip } from "../metricas/metricas.js";
import { avaliarRiscos } from "../riscos/regras.js";

export const ROTULO_DEMO = "Dados demonstrativos";

export function montarPacote({ time, dataReferencia, itens, config, janelaThroughput = 28, origem }) {
  const d = calcularDashboard(itens, dataReferencia, {
    limiteWip: config.limiteWip,
    janelaThroughput,
  });
  const lead = leadTime(itens, dataReferencia).map((l) => l.dias);
  const { riscos, naoAvaliadas } = avaliarRiscos(itens, dataReferencia, config);

  const demo = origem.demo;
  const resultado = origem.resultado;

  return {
    time,
    data_referencia: dataReferencia,
    origem_dos_dados: demo ? ROTULO_DEMO : `Dados importados de ${origem.nome}`,
    itens_no_time: itens.length,
    metricas: {
      wip: {
        valor: d.wip.valor,
        limite: d.wip.limite,
        acima_do_limite: d.wip.acimaDoLimite,
        itens: itensEmWip(itens, dataReferencia).map((i) => i.id),
      },
      cycle_time_dias: { n: d.cycleTime.n, media: d.cycleTime.media, p85: d.cycleTime.p85 },
      lead_time_dias: { n: lead.length, media: lead.length === 0 ? null : media(lead) },
      throughput: {
        janela_dias: d.throughput.janelaDias,
        inicio: d.throughput.inicio,
        fim: d.throughput.fim,
        itens_concluidos: d.throughput.valor,
      },
      aging_dias: aging(itens, dataReferencia),
      bugs: { em_andamento: d.bugs.emAndamento, percentual_do_wip: d.bugs.percentual },
      throughput_semanal: d.semanal.map((s) => ({
        semana_inicio: s.inicio,
        semana_fim: s.fim,
        concluidos: s.total,
        semana_parcial: s.parcial,
      })),
    },
    limites_usados: {
      limite_wip: config.limiteWip,
      r1_fator_severidade_alta: config.fatorAlta,
      r2_dias_de_bloqueio: config.diasBloqueio,
      r4_percentual_de_bugs_no_wip: config.percentualBugs,
      janela_throughput_dias: janelaThroughput,
      p85: "nearest-rank, posição ⌈0,85 × n⌉",
    },
    riscos_disparados: riscos.map((r) => ({
      regra: `${r.codigo} ${r.nome}`,
      severidade: r.severidade,
      itens: r.itens,
      evidencia: Object.fromEntries(r.evidencia.map((e) => [e.rotulo, e.valor])),
    })),
    regras_nao_avaliadas: naoAvaliadas.map((n) => ({ regra: n.codigo, motivo: n.motivo })),
    importacao: demo
      ? { linhas_lidas: itens.length, linhas_rejeitadas: [] }
      : {
          linhas_lidas: resultado.total,
          linhas_validas: resultado.itens.length,
          linhas_rejeitadas: resultado.invalidas.map((l) => ({
            linha: l.linha,
            id: l.id,
            motivos: l.motivos,
          })),
        },
  };
}

export const pacoteEmTexto = (pacote) => JSON.stringify(pacote, null, 2);
