/**
 * Radar de Riscos. Funções puras e determinísticas, sem IA.
 *
 * Cada risco nasce de uma regra explícita, avaliada sobre as métricas do motor
 * (src/metricas). A data de referência é sempre parâmetro.
 *
 * Regras:
 *  R1 Item envelhecido: aging > P85 do Cycle Time do time.
 *     Alta se aging > fatorAlta × P85, senão média. Um risco por item.
 *  R2 Bloqueio prolongado: item em andamento e bloqueado há mais de `diasBloqueio` dias.
 *     Alta. Um risco por item.
 *  R3 WIP acima do limite configurado. Média.
 *  R4 Bugs dominando o fluxo: mais de `percentualBugs`% do WIP é bug. Alta.
 *  R5 Escopo adicionado após o início da sprint: itens com adicionado_apos_inicio = sim. Média.
 *
 * Todas as comparações são "maior que", estritas.
 *
 * Os textos de impacto são hipóteses e vêm marcados como tal. Eles não afirmam
 * causa nem trazem números que não estejam nos dados.
 */

import { diasEntre } from "../metricas/datas.js";
import { aging, cycleTime, detalharPercentil85, itensEmWip } from "../metricas/metricas.js";
import { fmtDataBr, fmtNum } from "../componentes/formatos.js";

export const CONFIG_PADRAO = {
  limiteWip: 5,
  fatorAlta: 1.5,
  diasBloqueio: 2,
  percentualBugs: 50,
};

export const NOMES_DAS_REGRAS = {
  R1: "Item envelhecido",
  R2: "Bloqueio prolongado",
  R3: "WIP acima do limite",
  R4: "Bugs dominando o fluxo",
  R5: "Escopo adicionado após o início",
};

const IMPACTO = {
  R1: "Hipótese: o item pode estar parado em fila ou ter escopo maior que o previsto, e o que depende dele tende a atrasar. Precisa ser verificado com o time.",
  R2: "Hipótese: o item segue ocupando WIP sem avançar e pode haver uma dependência externa sem dono. Precisa ser verificado com quem está bloqueado.",
  R3: "Hipótese: com mais itens em andamento do que o limite combinado, o time divide atenção e os itens tendem a demorar mais para terminar. Precisa ser verificado no fluxo.",
  R4: "Hipótese: o trabalho corretivo pode estar ocupando a capacidade que iria para entregas planejadas. Precisa ser verificado com a origem dos bugs.",
  R5: "Hipótese: o escopo incluído depois do início pode competir com o que já estava planejado e afetar a meta da sprint. Precisa ser verificado com o PO.",
};

const ACAO = {
  R1: "Perguntar ao responsável o que impede o avanço. Decidir se o item continua, se é dividido ou se sai do fluxo, e registrar a decisão.",
  R2: "Identificar quem pode destravar, registrar o motivo do bloqueio no item e combinar um prazo de resposta. Sem resposta no prazo, escalar.",
  R3: "Parar de puxar novos itens e concluir ou destravar os mais antigos antes de iniciar outros.",
  R4: "Verificar a origem dos bugs, reservar capacidade para correção e alinhar com o PO o efeito no que foi planejado.",
  R5: "Confirmar com o PO o que entrou, qual o valor frente ao planejado e o que sai ou adia para proteger a meta.",
};

const PESO_SEVERIDADE = { alta: 0, media: 1 };

export const ROTULO_SEVERIDADE = { alta: "Alta", media: "Média" };

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const dias = (n) => `${fmtNum(n)} ${n === 1 ? "dia" : "dias"}`;

function evidenciaDoItem(item) {
  return [
    { rotulo: "Item", valor: `${item.id}, ${item.titulo}` },
    { rotulo: "Status", valor: item.status },
    { rotulo: "Iniciado em", valor: fmtDataBr(item.iniciado_em) },
  ];
}

function risco(codigo, severidade, { itens = [], evidencia, ordem = 0, sufixo = "" }) {
  return {
    chave: sufixo ? `${codigo}:${sufixo}` : codigo,
    codigo,
    nome: NOMES_DAS_REGRAS[codigo],
    severidade,
    itens,
    evidencia,
    impacto: IMPACTO[codigo],
    acao: ACAO[codigo],
    ordem,
  };
}

/**
 * Avalia as cinco regras para os itens de um time.
 *
 * Devolve:
 *  - riscos: ordenados por severidade (alta antes de média), depois por código da regra e,
 *    dentro da regra, pela magnitude (maior aging, maior tempo de bloqueio). Não se compara
 *    magnitude entre regras diferentes porque as unidades não são as mesmas.
 *  - naoAvaliadas: regras que não puderam rodar, com o motivo (nunca ficam em silêncio)
 *  - contexto: valores usados (P85, n, WIP)
 */
export function avaliarRiscos(itensDoTime, dataReferencia, config = {}) {
  const cfg = { ...CONFIG_PADRAO, ...config };
  const riscos = [];
  const naoAvaliadas = [];

  const emAndamento = itensEmWip(itensDoTime, dataReferencia);
  const porId = new Map(emAndamento.map((i) => [i.id, i]));

  // R1: aging contra o P85 do Cycle Time do time (todos os tipos, todo o histórico concluído).
  const ciclos = cycleTime(itensDoTime, dataReferencia).map((c) => c.dias);
  const p85 = detalharPercentil85(ciclos);
  if (p85.valor === null) {
    naoAvaliadas.push({
      codigo: "R1",
      motivo: "Não há itens concluídos para calcular o P85 do Cycle Time.",
    });
  } else {
    const limiteAlta = cfg.fatorAlta * p85.valor;
    for (const { id, dias: idade } of aging(itensDoTime, dataReferencia)) {
      if (!(idade > p85.valor)) continue;
      const item = porId.get(id);
      const alta = idade > limiteAlta;
      riscos.push(
        risco("R1", alta ? "alta" : "media", {
          itens: [id],
          sufixo: id,
          ordem: idade,
          evidencia: [
            ...evidenciaDoItem(item),
            { rotulo: "Aging", valor: dias(idade) },
            {
              rotulo: "P85 do Cycle Time do time",
              valor: `${dias(p85.valor)} (n = ${plural(p85.n, "item concluído", "itens concluídos")})`,
            },
            {
              rotulo: "Limite para severidade alta",
              valor: `${fmtNum(limiteAlta)} dias (${fmtNum(cfg.fatorAlta)} × P85)`,
            },
          ],
        })
      );
    }
  }

  // R2: bloqueado há mais de N dias, só entre itens em andamento.
  for (const item of emAndamento) {
    if (item.bloqueado !== "sim" || !item.bloqueado_desde) continue;
    const bloqueadoHa = diasEntre(item.bloqueado_desde, dataReferencia);
    if (!(bloqueadoHa > cfg.diasBloqueio)) continue;
    riscos.push(
      risco("R2", "alta", {
        itens: [item.id],
        sufixo: item.id,
        ordem: bloqueadoHa,
        evidencia: [
          ...evidenciaDoItem(item),
          { rotulo: "Bloqueado desde", valor: fmtDataBr(item.bloqueado_desde) },
          { rotulo: "Bloqueado há", valor: dias(bloqueadoHa) },
          { rotulo: "Limite configurado", valor: `mais de ${dias(cfg.diasBloqueio)}` },
        ],
      })
    );
  }

  // R3: WIP acima do limite.
  const wip = emAndamento.length;
  if (wip > cfg.limiteWip) {
    riscos.push(
      risco("R3", "media", {
        itens: emAndamento.map((i) => i.id),
        ordem: wip - cfg.limiteWip,
        evidencia: [
          { rotulo: "WIP", valor: `${plural(wip, "item", "itens")} em ${fmtDataBr(dataReferencia)}` },
          { rotulo: "Limite configurado", valor: String(cfg.limiteWip) },
          { rotulo: "Acima do limite em", valor: plural(wip - cfg.limiteWip, "item", "itens") },
          { rotulo: "Itens em andamento", valor: emAndamento.map((i) => i.id).join(", ") },
        ],
      })
    );
  }

  // R4: bugs acima de X% do WIP (comparação em inteiros, sem erro de ponto flutuante).
  const bugs = emAndamento.filter((i) => i.tipo === "bug");
  if (wip > 0 && bugs.length * 100 > cfg.percentualBugs * wip) {
    const percentual = (bugs.length * 100) / wip;
    riscos.push(
      risco("R4", "alta", {
        itens: bugs.map((i) => i.id),
        ordem: percentual,
        evidencia: [
          {
            rotulo: "Bugs em andamento",
            valor: `${bugs.length} de ${plural(wip, "item", "itens")} do WIP (${fmtNum(percentual)}%)`,
          },
          { rotulo: "Limite configurado", valor: `mais de ${fmtNum(cfg.percentualBugs)}% do WIP` },
          { rotulo: "Bugs", valor: bugs.map((i) => i.id).join(", ") },
        ],
      })
    );
  }

  // R5: itens marcados como adicionados após o início, em qualquer status.
  const adicionados = itensDoTime.filter((i) => i.adicionado_apos_inicio === "sim");
  if (adicionados.length > 0) {
    riscos.push(
      risco("R5", "media", {
        itens: adicionados.map((i) => i.id),
        ordem: adicionados.length,
        evidencia: [
          {
            rotulo: "Itens adicionados após o início",
            valor: `${adicionados.length} de ${plural(itensDoTime.length, "item", "itens")} do time`,
          },
          {
            rotulo: "Itens",
            valor: adicionados.map((i) => `${i.id} (${i.status})`).join(", "),
          },
        ],
      })
    );
  }

  riscos.sort(
    (a, b) =>
      PESO_SEVERIDADE[a.severidade] - PESO_SEVERIDADE[b.severidade] ||
      a.codigo.localeCompare(b.codigo) ||
      b.ordem - a.ordem ||
      a.chave.localeCompare(b.chave)
  );

  return {
    riscos,
    naoAvaliadas,
    contexto: { wip, p85: p85.valor, nCicloConcluidos: p85.n },
  };
}
