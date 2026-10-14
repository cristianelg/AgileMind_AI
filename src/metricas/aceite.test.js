import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCsv } from "../dados/parseCsv.js";
import { diaDoCalendario, diasEntre, somarDias } from "./datas.js";
import { aging, cycleTime, detalharPercentil85, percentil85, wip } from "./metricas.js";
import { calcularTime } from "./index.js";

const REFERENCIA = "2026-10-13";
const csv = readFileSync(new URL("../../dados/itens_demo.csv", import.meta.url), "utf8");
const itens = parseCsv(csv);
const doTime = (nome) => itens.filter((i) => i.time === nome);

/** Passo a passo impresso quando um valor não bate. */
function passoAPasso(nome, referencia = REFERENCIA) {
  const r = calcularTime(doTime(nome), referencia, 28);
  const p = r.cycleTimeP85;
  return [
    `${nome}, data de referência ${referencia}`,
    `WIP: ${r.idsWip.join(", ") || "nenhum"} = ${r.wip}`,
    `Cycle Times: ${r.cycleTimes.map((c) => `${c.id}=${c.dias}`).join(", ")}`,
    `Ordenados: ${p.ordenados.join(", ")}`,
    `n = ${p.n}, posição ⌈0,85 × ${p.n}⌉ = ${p.posicao}, valor = ${p.valor}`,
  ].join("\n");
}

test("aceite: Squad Órbita, WIP 6 e P85 do Cycle Time 6 dias", () => {
  const r = calcularTime(doTime("Squad Órbita"), REFERENCIA);
  assert.equal(r.wip, 6, passoAPasso("Squad Órbita"));
  assert.equal(r.cycleTimeP85.valor, 6, passoAPasso("Squad Órbita"));
});

test("aceite: Squad Farol, WIP 6 e P85 do Cycle Time 9 dias", () => {
  const r = calcularTime(doTime("Squad Farol"), REFERENCIA);
  assert.equal(r.wip, 6, passoAPasso("Squad Farol"));
  assert.equal(r.cycleTimeP85.valor, 9, passoAPasso("Squad Farol"));
});

test("Squad Órbita bate com o pacote de contexto (média, throughput e aging)", () => {
  const r = calcularTime(doTime("Squad Órbita"), REFERENCIA, 28);
  assert.equal(Math.round(r.cycleTimeMedio * 10) / 10, 4.6, passoAPasso("Squad Órbita"));
  assert.equal(r.throughput, 7, passoAPasso("Squad Órbita"));
  const agings = r.agings.map((a) => a.dias).sort((a, b) => b - a);
  assert.deepEqual(agings, [12, 8, 7, 6, 5, 3]);
});

test("datas: diferença em dias de calendário, sem efeito de fuso", () => {
  assert.equal(diasEntre("2026-10-31", "2026-11-01"), 1);
  assert.equal(diasEntre("2026-12-31", "2027-01-01"), 1);
  assert.equal(diasEntre("2028-02-28", "2028-03-01"), 2); // ano bissexto
  assert.equal(diasEntre("2026-10-13", "2026-10-13"), 0);
  assert.equal(somarDias("2026-10-13", -27), "2026-09-16");
  assert.throws(() => diaDoCalendario("2026-02-31"));
  assert.throws(() => diaDoCalendario("13/10/2026"));
});

test("P85 nearest-rank usa inteiros: n = 20 dá posição 17", () => {
  const vinte = Array.from({ length: 20 }, (_, i) => i + 1);
  assert.equal(detalharPercentil85(vinte).posicao, 17);
  assert.equal(percentil85(vinte), 17);
  assert.equal(percentil85([]), null);
  assert.equal(percentil85([7]), 7);
});

test("a data de referência é parâmetro: outra data, outro resultado", () => {
  const orbita = doTime("Squad Órbita");
  assert.equal(wip(orbita, "2026-09-20"), 1); // só ORB-104
  assert.deepEqual(
    cycleTime(orbita, "2026-09-20").map((c) => c.id),
    ["ORB-101", "ORB-102", "ORB-103"]
  );
  assert.deepEqual(aging(orbita, "2026-09-20"), [{ id: "ORB-104", dias: 3 }]);
});
