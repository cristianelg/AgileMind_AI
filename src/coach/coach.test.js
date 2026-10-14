import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCsv } from "../dados/parseCsv.js";
import { validarCsv } from "../dados/validarCsv.js";
import { lerConfig, TEXTOS_PADRAO } from "../riscos/config.js";
import { montarPacote, pacoteEmTexto, ROTULO_DEMO } from "./pacote.js";
import { montarPrompt, MARCADOR_PACOTE } from "./prompt.js";
import { validarPlano, PLANO_VAZIO } from "./pdca.js";

const REF = "2026-10-13";
const texto = readFileSync(new URL("../../dados/itens_demo.csv", import.meta.url), "utf8");
const itens = parseCsv(texto);
const doTime = (n) => itens.filter((i) => i.time === n);
const { config } = lerConfig(TEXTOS_PADRAO);
const pacoteDemo = (time) =>
  montarPacote({ time, dataReferencia: REF, itens: doTime(time), config, origem: { demo: true } });

test("pacote da Órbita traz as métricas, limites e riscos já calculados", () => {
  const p = pacoteDemo("Squad Órbita");
  assert.equal(p.time, "Squad Órbita");
  assert.equal(p.data_referencia, REF);
  assert.equal(p.origem_dos_dados, ROTULO_DEMO);
  assert.equal(p.metricas.wip.valor, 6);
  assert.equal(p.metricas.wip.limite, 5);
  assert.equal(p.metricas.cycle_time_dias.p85, 6);
  assert.equal(p.metricas.cycle_time_dias.media, 4.625);
  assert.equal(p.metricas.throughput.itens_concluidos, 7);
  assert.deepEqual(p.metricas.throughput_semanal.map((s) => s.concluidos), [1, 2, 2, 1, 2, 0]);
  assert.equal(p.limites_usados.r1_fator_severidade_alta, 1.5);
  assert.deepEqual(p.riscos_disparados.map((r) => r.regra.slice(0, 2)), ["R1", "R2", "R1", "R1", "R3", "R5"]);
  assert.equal(p.riscos_disparados[0].severidade, "alta");
  assert.equal(p.riscos_disparados[0].evidencia["Aging"], "12 dias");
  assert.deepEqual(p.importacao, { linhas_lidas: 15, linhas_rejeitadas: [] });
});

test("pacote é reproduzível: mesmos dados, mesmo texto, sem carimbo de tempo", () => {
  assert.equal(pacoteEmTexto(pacoteDemo("Squad Farol")), pacoteEmTexto(pacoteDemo("Squad Farol")));
  assert.doesNotMatch(pacoteEmTexto(pacoteDemo("Squad Farol")), /gerado_em|timestamp/);
});

test("o JSON do pacote é válido e volta igual", () => {
  const p = pacoteDemo("Squad Farol");
  assert.deepEqual(JSON.parse(pacoteEmTexto(p)), p);
});

test("pacote de dados importados lista as linhas rejeitadas", () => {
  const cab = texto.split("\n")[0];
  const csv = [cab, "A-1,T,história,Ok,Concluído,2026-09-01,2026-09-02,2026-09-05,nao,,3,nao", "A-2,T,tarefa,Ruim,Teste,2026-09-10,2026-09-08,,sim,,1,nao"].join("\n");
  const resultado = validarCsv(csv);
  const p = montarPacote({ time: "T", dataReferencia: REF, itens: resultado.itens, config, origem: { demo: false, nome: "teste.csv", resultado } });
  assert.equal(p.origem_dos_dados, "Dados importados de teste.csv");
  assert.equal(p.importacao.linhas_lidas, 2);
  assert.equal(p.importacao.linhas_validas, 1);
  assert.equal(p.importacao.linhas_rejeitadas[0].linha, 3);
  assert.equal(p.importacao.linhas_rejeitadas[0].id, "A-2");
  assert.ok(p.importacao.linhas_rejeitadas[0].motivos.length >= 2);
});

test("montarPrompt troca o marcador, inclusive com $ no pacote", () => {
  const modelo = `Analise:\n${MARCADOR_PACOTE}\nFim`;
  assert.equal(montarPrompt('{"v":"$& $1"}', modelo), 'Analise:\n{"v":"$& $1"}\nFim');
  assert.equal(montarPrompt("X", `${MARCADOR_PACOTE} e ${MARCADOR_PACOTE}`), "X e X");
  assert.doesNotMatch(montarPrompt("X"), /\{\{PACOTE_JSON\}\}/);
});

test("PDCA: campos obrigatórios e critério mensurável", () => {
  assert.deepEqual(Object.keys(validarPlano(PLANO_VAZIO)).sort(), ["acao", "criterio", "dataChecagem", "metrica", "prazo", "responsavel", "riscoChave"]);
  const ok = { ...PLANO_VAZIO, riscoChave: "R3", acao: "Parar de puxar itens", responsavel: "Ana", prazo: "2026-10-16", criterio: "WIP em 5 itens ou menos", metrica: "WIP", dataChecagem: "2026-10-20" };
  assert.deepEqual(validarPlano(ok), {});
  assert.match(validarPlano({ ...ok, criterio: "Melhorar o fluxo" }).criterio, /mensurável/);
  assert.deepEqual(validarPlano({ ...ok, criterio: "Zero bloqueios acima do limite" }), {});
  assert.match(validarPlano({ ...ok, dataChecagem: "2026-10-10" }).dataChecagem, /no prazo ou depois/);
});
