import { describe, expect, it } from "vitest";
import csv from "../../../dados/itens_demo.csv?raw";
import { avaliarRiscos, CONFIG_PADRAO, parseCsv } from "../index";
import type { Risco } from "../index";

/**
 * Aceite do incremento P5 (Radar de Riscos), referência 2026-10-13, limite de WIP 5.
 * Órbita: R1 para ORB-109, ORB-110 e ORB-112; R2 para ORB-109; R3; R5. Não dispara R4.
 * Farol:  R1 para FAR-209; R2 para FAR-208; R3; R4.
 */
const REF = "2026-10-13";
const itens = parseCsv(csv);
const doTime = (nome: string) => itens.filter((i) => i.time === nome);
const ids = (riscos: Risco[], codigo: string) =>
  riscos.filter((r) => r.codigo === codigo).flatMap((r) => r.itens).sort();

function relatorio(nome: string, riscos: Risco[]): string {
  return [`${nome}, referência ${REF}, limite ${CONFIG_PADRAO.limiteWip}`, ...riscos.map((r) => `${r.chave} ${r.severidade}`)].join("\n");
}

describe("aceite P5: riscos", () => {
  it("Squad Órbita dispara R1 (109, 110, 112), R2 (109), R3 e R5, e não dispara R4", () => {
    const { riscos } = avaliarRiscos(doTime("Squad Órbita"), REF);
    const msg = relatorio("Squad Órbita", riscos);
    expect(ids(riscos, "R1"), msg).toEqual(["ORB-109", "ORB-110", "ORB-112"]);
    expect(ids(riscos, "R2"), msg).toEqual(["ORB-109"]);
    expect(riscos.filter((r) => r.codigo === "R3"), msg).toHaveLength(1);
    expect(riscos.filter((r) => r.codigo === "R5"), msg).toHaveLength(1);
    expect(riscos.filter((r) => r.codigo === "R4"), msg).toHaveLength(0);
  });

  it("Squad Farol dispara R1 (209), R2 (208), R3 e R4", () => {
    const { riscos } = avaliarRiscos(doTime("Squad Farol"), REF);
    const msg = relatorio("Squad Farol", riscos);
    expect(ids(riscos, "R1"), msg).toEqual(["FAR-209"]);
    expect(ids(riscos, "R2"), msg).toEqual(["FAR-208"]);
    expect(riscos.filter((r) => r.codigo === "R3"), msg).toHaveLength(1);
    expect(riscos.filter((r) => r.codigo === "R4"), msg).toHaveLength(1);
  });

  it("severidade do R1: alta só acima de 1,5 × P85", () => {
    const orbita = avaliarRiscos(doTime("Squad Órbita"), REF).riscos;
    const sev = (chave: string) => orbita.find((r) => r.chave === chave)?.severidade;
    expect(sev("R1:ORB-109")).toBe("alta");
    expect(sev("R1:ORB-110")).toBe("media");
    const farol = avaliarRiscos(doTime("Squad Farol"), REF).riscos;
    expect(farol.find((r) => r.chave === "R1:FAR-209")?.severidade).toBe("media");
  });

  it("R1 é estrito: aging igual ao P85 não dispara", () => {
    const { riscos } = avaliarRiscos(doTime("Squad Órbita"), REF);
    expect(ids(riscos, "R1")).not.toContain("ORB-115");
  });

  it("ordenação: severidade, depois código da regra, depois magnitude", () => {
    const farol = avaliarRiscos(doTime("Squad Farol"), REF).riscos.map((r) => r.chave);
    expect(farol).toEqual(["R2:FAR-208", "R4", "R1:FAR-209", "R3"]);
    const orbita = avaliarRiscos(doTime("Squad Órbita"), REF).riscos.map((r) => r.chave);
    expect(orbita).toEqual(["R1:ORB-109", "R2:ORB-109", "R1:ORB-110", "R1:ORB-112", "R3", "R5"]);
  });

  it("todo risco traz evidência, impacto marcado como hipótese e ação", () => {
    for (const nome of ["Squad Órbita", "Squad Farol"]) {
      for (const r of avaliarRiscos(doTime(nome), REF).riscos) {
        expect(r.evidencia.length, r.chave).toBeGreaterThanOrEqual(2);
        expect(r.impacto, r.chave).toMatch(/^Hipótese:/);
        expect(r.acao.length, r.chave).toBeGreaterThan(0);
      }
    }
  });

  it("limites configuráveis mudam o resultado", () => {
    const t = doTime("Squad Órbita");
    const tem = (cfg: Parameters<typeof avaliarRiscos>[2], codigo: string) =>
      avaliarRiscos(t, REF, cfg).riscos.some((r) => r.codigo === codigo);
    expect(tem({ limiteWip: 6 }, "R3")).toBe(false);
    expect(tem({ limiteWip: 5 }, "R3")).toBe(true);
    expect(tem({ diasBloqueio: 5 }, "R2")).toBe(false);
    expect(tem({ percentualBugs: 30 }, "R4")).toBe(true);
  });

  it("sem itens concluídos, R1 vira 'não avaliada' em vez de sumir", () => {
    const soAndamento = doTime("Squad Órbita").filter((i) => !i.concluido_em);
    const r = avaliarRiscos(soAndamento, REF);
    expect(r.naoAvaliadas[0]?.codigo).toBe("R1");
  });
});

describe("textos em português", () => {
  it("singular e plural de dias na evidência", () => {
    const base = parseCsv(csv).filter((i) => i.time === "Squad Órbita");
    // ORB-113 começou em 10/10: com referência 11/10 o aging é 1 dia, mas só vira risco se passar do P85.
    // Aqui basta checar o formato do R2 com bloqueio de 1 dia e limite 0.
    const r = avaliarRiscos(base, "2026-10-13", { diasBloqueio: 0 }).riscos.find((x) => x.chave === "R2:ORB-115");
    expect(r?.evidencia.find((e) => e.rotulo === "Bloqueado há")?.valor).toBe("1 dia");
  });
});
