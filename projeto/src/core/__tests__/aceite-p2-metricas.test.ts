import { describe, expect, it } from "vitest";
import csv from "../../../dados/itens_demo.csv?raw";
import { aging, cycleTime, detalharPercentil85, leadTime, media, parseCsv, throughput, wip, itensEmWip } from "../index";

/**
 * Aceite do incremento P2 (motor de métricas), com o CSV de exemplo e referência 2026-10-13.
 * Squad Órbita: WIP = 6, P85 do Cycle Time = 6 dias.
 * Squad Farol:  WIP = 6, P85 do Cycle Time = 9 dias.
 */
const REF = "2026-10-13";
const itens = parseCsv(csv);
const doTime = (nome: string) => itens.filter((i) => i.time === nome);

function passoAPasso(nome: string): string {
  const t = doTime(nome);
  const p = detalharPercentil85(cycleTime(t, REF).map((c) => c.dias));
  return [
    `${nome}, referência ${REF}`,
    `WIP: ${itensEmWip(t, REF).map((i) => i.id).join(", ")} = ${wip(t, REF)}`,
    `Ordenados: ${p.ordenados.join(", ")}`,
    `n = ${p.n}, posição = ${p.posicao}, valor = ${p.valor}`,
  ].join("\n");
}

describe("aceite P2: métricas", () => {
  it("Squad Órbita: WIP 6 e P85 do Cycle Time 6 dias", () => {
    const t = doTime("Squad Órbita");
    expect(wip(t, REF), passoAPasso("Squad Órbita")).toBe(6);
    expect(detalharPercentil85(cycleTime(t, REF).map((c) => c.dias)).valor, passoAPasso("Squad Órbita")).toBe(6);
  });

  it("Squad Farol: WIP 6 e P85 do Cycle Time 9 dias", () => {
    const t = doTime("Squad Farol");
    expect(wip(t, REF), passoAPasso("Squad Farol")).toBe(6);
    expect(detalharPercentil85(cycleTime(t, REF).map((c) => c.dias)).valor, passoAPasso("Squad Farol")).toBe(9);
  });

  it("valores de conferência manual da Órbita (média, lead time, throughput, aging)", () => {
    const t = doTime("Squad Órbita");
    expect(media(cycleTime(t, REF).map((c) => c.dias))).toBe(4.625);
    expect(media(leadTime(t, REF).map((l) => l.dias))).toBe(10);
    expect(throughput(t, REF, 28)).toBe(7);
    expect(aging(t, REF).map((a) => a.dias)).toEqual([12, 8, 5, 7, 3, 6]);
  });

  it("valores de conferência manual da Farol", () => {
    const t = doTime("Squad Farol");
    expect(media(cycleTime(t, REF).map((c) => c.dias))).toBeCloseTo(6.143, 3);
    expect(throughput(t, REF, 28)).toBe(5);
    expect(aging(t, REF).map((a) => a.dias)).toEqual([7, 13, 4, 5, 8, 1]);
  });

  it("P85 nearest-rank sem erro de ponto flutuante: n = 20 usa a posição 17", () => {
    const lista = Array.from({ length: 20 }, (_, i) => i + 1);
    const r = detalharPercentil85(lista);
    expect(r.posicao).toBe(17);
    expect(r.valor).toBe(17);
  });

  it("a data de referência é parâmetro: outra data muda o WIP", () => {
    const t = doTime("Squad Órbita");
    expect(wip(t, "2026-10-13")).not.toBe(wip(t, "2026-09-20"));
  });
});
