import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCsv } from "../dados/parseCsv.js";
import { avaliarRiscos, CONFIG_PADRAO } from "./regras.js";

const REFERENCIA = "2026-10-13";
const itens = parseCsv(readFileSync(new URL("../../dados/itens_demo.csv", import.meta.url), "utf8"));
const doTime = (nome) => itens.filter((i) => i.time === nome);
const ids = (riscos, codigo) => riscos.filter((r) => r.codigo === codigo).flatMap((r) => r.itens).sort();
const codigos = (riscos) => [...new Set(riscos.map((r) => r.codigo))].sort();

/** Passo a passo impresso quando o aceite não bate. */
function relatorio(nome, resultado) {
  return [
    `${nome}, referência ${REFERENCIA}, limite ${CONFIG_PADRAO.limiteWip}`,
    `contexto: ${JSON.stringify(resultado.contexto)}`,
    ...resultado.riscos.map((r) => `${r.chave} ${r.severidade} ${r.evidencia.map((e) => `${e.rotulo}=${e.valor}`).join(" | ")}`),
  ].join("\n");
}

test("aceite: Squad Órbita dispara R1 (109, 110, 112), R2 (109), R3 e R5, e não dispara R4", () => {
  const r = avaliarRiscos(doTime("Squad Órbita"), REFERENCIA);
  const msg = relatorio("Squad Órbita", r);
  assert.deepEqual(ids(r.riscos, "R1"), ["ORB-109", "ORB-110", "ORB-112"], msg);
  assert.deepEqual(ids(r.riscos, "R2"), ["ORB-109"], msg);
  assert.equal(r.riscos.filter((x) => x.codigo === "R3").length, 1, msg);
  assert.equal(r.riscos.filter((x) => x.codigo === "R5").length, 1, msg);
  assert.equal(r.riscos.filter((x) => x.codigo === "R4").length, 0, msg);
  assert.deepEqual(codigos(r.riscos), ["R1", "R2", "R3", "R5"], msg);
});

test("aceite: Squad Farol dispara R1 (209), R2 (208), R3 e R4", () => {
  const r = avaliarRiscos(doTime("Squad Farol"), REFERENCIA);
  const msg = relatorio("Squad Farol", r);
  assert.deepEqual(ids(r.riscos, "R1"), ["FAR-209"], msg);
  assert.deepEqual(ids(r.riscos, "R2"), ["FAR-208"], msg);
  assert.equal(r.riscos.filter((x) => x.codigo === "R3").length, 1, msg);
  assert.equal(r.riscos.filter((x) => x.codigo === "R4").length, 1, msg);
});

test("R1: severidade alta só acima de 1,5 × P85", () => {
  const orbita = avaliarRiscos(doTime("Squad Órbita"), REFERENCIA);
  const sev = (id) => orbita.riscos.find((r) => r.chave === `R1:${id}`).severidade;
  // P85 = 6, limite de severidade alta = 9. Aging: 109 = 12, 110 = 8, 112 = 7.
  assert.equal(sev("ORB-109"), "alta");
  assert.equal(sev("ORB-110"), "media");
  assert.equal(sev("ORB-112"), "media");
  // Farol: P85 = 9, limite = 13,5. FAR-209 tem aging 13, então é média.
  const farol = avaliarRiscos(doTime("Squad Farol"), REFERENCIA);
  assert.equal(farol.riscos.find((r) => r.chave === "R1:FAR-209").severidade, "media");
});

test("R1 é estrito: aging igual ao P85 não dispara", () => {
  // ORB-115 tem aging 6 e o P85 é 6.
  const r = avaliarRiscos(doTime("Squad Órbita"), REFERENCIA);
  assert.ok(!ids(r.riscos, "R1").includes("ORB-115"));
});

test("limites configuráveis mudam o resultado", () => {
  const orbita = doTime("Squad Órbita");
  assert.equal(avaliarRiscos(orbita, REFERENCIA, { limiteWip: 6 }).riscos.some((r) => r.codigo === "R3"), false);
  assert.equal(avaliarRiscos(orbita, REFERENCIA, { limiteWip: 5 }).riscos.some((r) => r.codigo === "R3"), true);
  assert.equal(avaliarRiscos(orbita, REFERENCIA, { diasBloqueio: 5 }).riscos.some((r) => r.codigo === "R2"), false);
  assert.equal(avaliarRiscos(orbita, REFERENCIA, { diasBloqueio: 4 }).riscos.some((r) => r.codigo === "R2"), true);
  assert.equal(avaliarRiscos(orbita, REFERENCIA, { percentualBugs: 30 }).riscos.some((r) => r.codigo === "R4"), true);
  const alta = (cfg) => avaliarRiscos(orbita, REFERENCIA, cfg).riscos.find((r) => r.chave === "R1:ORB-110").severidade;
  assert.equal(alta({ fatorAlta: 1.2 }), "alta");
  assert.equal(alta({ fatorAlta: 1.5 }), "media");
});

test("ordenação: alta antes de média, e dentro da severidade o maior primeiro", () => {
  const { riscos } = avaliarRiscos(doTime("Squad Órbita"), REFERENCIA);
  const pesos = riscos.map((r) => (r.severidade === "alta" ? 0 : 1));
  assert.deepEqual(pesos, [...pesos].sort((a, b) => a - b));
  assert.equal(riscos[0].chave, "R1:ORB-109");
  const medias = riscos.filter((r) => r.severidade === "media" && r.codigo === "R1").map((r) => r.chave);
  assert.deepEqual(medias, ["R1:ORB-110", "R1:ORB-112"]);
});

test("ordenação entre regras: dentro da severidade, por código da regra", () => {
  const farol = avaliarRiscos(doTime("Squad Farol"), REFERENCIA).riscos.map((r) => r.chave);
  assert.deepEqual(farol, ["R2:FAR-208", "R4", "R1:FAR-209", "R3"]);
  const orbita = avaliarRiscos(doTime("Squad Órbita"), REFERENCIA).riscos.map((r) => r.chave);
  assert.deepEqual(orbita, ["R1:ORB-109", "R2:ORB-109", "R1:ORB-110", "R1:ORB-112", "R3", "R5"]);
});

test("cada risco traz evidência, impacto marcado como hipótese, ação e itens", () => {
  for (const nome of ["Squad Órbita", "Squad Farol"]) {
    for (const r of avaliarRiscos(doTime(nome), REFERENCIA).riscos) {
      assert.ok(r.evidencia.length >= 2, r.chave);
      assert.match(r.impacto, /^Hipótese:/, r.chave);
      assert.ok(r.acao.length > 0, r.chave);
      assert.ok(r.itens.length > 0, r.chave);
    }
  }
});

test("evidência de R1 mostra os números exatos", () => {
  const r = avaliarRiscos(doTime("Squad Órbita"), REFERENCIA).riscos.find((x) => x.chave === "R1:ORB-109");
  const valor = (rotulo) => r.evidencia.find((e) => e.rotulo === rotulo).valor;
  assert.equal(valor("Aging"), "12 dias");
  assert.match(valor("P85 do Cycle Time do time"), /^6 dias \(n = 8 itens concluídos\)$/);
  assert.equal(valor("Limite para severidade alta"), "9 dias (1,5 × P85)");
  assert.equal(valor("Iniciado em"), "01/10/2026");
});

test("a data de referência é parâmetro: outra data muda o resultado", () => {
  const a = avaliarRiscos(doTime("Squad Órbita"), "2026-10-13");
  const b = avaliarRiscos(doTime("Squad Órbita"), "2026-10-09");
  assert.notDeepEqual(a.riscos.map((r) => r.chave), b.riscos.map((r) => r.chave));
});

test("sem itens concluídos, R1 vira 'não avaliada' em vez de sumir", () => {
  const soAndamento = doTime("Squad Órbita").filter((i) => !i.concluido_em);
  const r = avaliarRiscos(soAndamento, REFERENCIA);
  assert.equal(r.naoAvaliadas[0].codigo, "R1");
  assert.equal(r.riscos.some((x) => x.codigo === "R1"), false);
});

test("time vazio não gera risco nem erro", () => {
  const r = avaliarRiscos([], REFERENCIA);
  assert.deepEqual(r.riscos, []);
});
