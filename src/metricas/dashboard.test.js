import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCsv } from "../dados/parseCsv.js";
import { diaDaSemana, inicioDaSemana } from "./datas.js";
import { calcularDashboard } from "./dashboard.js";

const REF = "2026-10-13"; // terça-feira
const itens = parseCsv(readFileSync(new URL("../../dados/itens_demo.csv", import.meta.url), "utf8"));
const doTime = (nome) => itens.filter((i) => i.time === nome);
const totais = (semanas) => semanas.map((s) => s.total);

test("semana de segunda a domingo", () => {
  assert.equal(diaDaSemana("2026-10-13"), 1); // terça
  assert.equal(diaDaSemana("2026-10-12"), 0); // segunda
  assert.equal(diaDaSemana("2026-10-18"), 6); // domingo
  assert.equal(inicioDaSemana("2026-10-18"), "2026-10-12");
  assert.equal(inicioDaSemana("2026-10-12"), "2026-10-12");
  assert.equal(inicioDaSemana("2026-09-12"), "2026-09-07"); // sábado
});

test("cartões da Squad Órbita, todos os tipos e todo o período", () => {
  const d = calcularDashboard(doTime("Squad Órbita"), REF);
  assert.equal(d.wip.valor, 6);
  assert.equal(d.wip.limite, 5);
  assert.equal(d.wip.acimaDoLimite, true);
  assert.equal(d.cycleTime.n, 8);
  assert.equal(d.cycleTime.p85, 6);
  assert.equal(d.throughput.valor, 7);
  assert.equal(d.throughput.inicio, "2026-09-16");
  assert.equal(d.bugs.emAndamento, 2);
  assert.equal(d.bugs.wipTotal, 6);
  assert.equal(Math.round(d.bugs.percentual), 33); // pacote de contexto: 33
});

test("limite de WIP configurável: com limite 6 não há destaque", () => {
  const d = calcularDashboard(doTime("Squad Órbita"), REF, { limiteWip: 6 });
  assert.equal(d.wip.acimaDoLimite, false);
});

test("throughput semanal, calculado à mão a partir das datas do CSV", () => {
  const orbita = calcularDashboard(doTime("Squad Órbita"), REF).semanal;
  assert.deepEqual(totais(orbita), [1, 2, 2, 1, 2, 0]);
  assert.equal(orbita[0].inicio, "2026-09-07");
  assert.equal(orbita.at(-1).inicio, "2026-10-12");
  assert.equal(orbita.at(-1).parcial, true); // a semana de 12/10 ainda não terminou
  assert.equal(orbita[0].parcial, false);

  const farol = calcularDashboard(doTime("Squad Farol"), REF).semanal;
  assert.deepEqual(totais(farol), [2, 2, 0, 2, 1, 0]);
});

test("período de 14 dias vai de 2026-09-30 a 2026-10-13", () => {
  const d = calcularDashboard(doTime("Squad Órbita"), REF, { periodoDias: 14 });
  assert.equal(d.periodo.desde, "2026-09-30");
  assert.equal(d.cycleTime.n, 2); // ORB-107 (6 dias) e ORB-108 (3 dias)
  assert.equal(d.cycleTime.media, 4.5);
  assert.equal(d.cycleTime.p85, 6);
  assert.deepEqual(totais(d.semanal), [0, 2, 0]);
  assert.deepEqual(d.semanal.map((s) => s.parcial), [true, false, true]);
  assert.equal(d.wip.valor, 6); // WIP não segue o período
  assert.equal(d.throughput.valor, 7); // nem o throughput de 28 dias
});

test("filtro de tipo: bug", () => {
  const d = calcularDashboard(doTime("Squad Órbita"), REF, { tipo: "bug" });
  assert.equal(d.wip.valor, 2); // ORB-111 e ORB-113
  assert.equal(d.cycleTime.n, 3); // ORB-103, ORB-106, ORB-108
  assert.equal(d.cycleTime.media, 3);
  assert.equal(d.cycleTime.p85, 5);
  assert.equal(d.dispersao.every((p) => p.tipo === "bug"), true);
});

test("filtro de tipo: o cartão de bugs ignora o filtro", () => {
  const d = calcularDashboard(doTime("Squad Órbita"), REF, { tipo: "história" });
  assert.equal(d.wip.valor, 4);
  assert.equal(d.bugs.emAndamento, 2);
  assert.equal(d.bugs.wipTotal, 6);
});

test("dispersão: um ponto por item concluído, em ordem de data", () => {
  const d = calcularDashboard(doTime("Squad Farol"), REF);
  assert.equal(d.dispersao.length, 7);
  const dias = d.dispersao.map((p) => p.dia);
  assert.deepEqual(dias, [...dias].sort((a, b) => a - b));
  assert.equal(d.cycleTime.p85, 9);
});

test("sem itens: valores nulos e listas vazias, sem erro", () => {
  const d = calcularDashboard([], REF);
  assert.equal(d.wip.valor, 0);
  assert.equal(d.cycleTime.media, null);
  assert.equal(d.cycleTime.p85, null);
  assert.equal(d.bugs.percentual, null);
  assert.deepEqual(d.semanal, []);
  assert.deepEqual(d.dispersao, []);
});
