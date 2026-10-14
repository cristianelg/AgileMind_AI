import { describe, expect, it } from "vitest";
import { extrairTexto, LIMITE_PACOTE_BYTES, montarPrompt, montarRequisicao, validarEntrada } from "./handler";

const ORG = "00000000-0000-0000-0000-00000000aaaa";

describe("validarEntrada", () => {
  it("aceita org_id uuid e pacote objeto", () => {
    const r = validarEntrada({ org_id: ORG, pacote: { time: "Órbita" } });
    expect(r.ok).toBe(true);
  });
  it("recusa org_id fora do formato", () => {
    expect(validarEntrada({ org_id: "abc", pacote: {} })).toMatchObject({ ok: false, status: 400 });
  });
  it("recusa pacote que não é objeto", () => {
    expect(validarEntrada({ org_id: ORG, pacote: "texto" })).toMatchObject({ ok: false, status: 400 });
    expect(validarEntrada({ org_id: ORG, pacote: [1] })).toMatchObject({ ok: false, status: 400 });
    expect(validarEntrada(null)).toMatchObject({ ok: false, status: 400 });
  });
  it("recusa pacote acima do limite", () => {
    const grande = { x: "a".repeat(LIMITE_PACOTE_BYTES) };
    expect(validarEntrada({ org_id: ORG, pacote: grande })).toMatchObject({ ok: false, status: 413 });
  });
});

describe("montarPrompt", () => {
  it("troca o marcador e não interpreta $& no pacote", () => {
    expect(montarPrompt("A {{PACOTE_JSON}} B", "x$&y")).toBe("A x$&y B");
  });
});

describe("montarRequisicao", () => {
  it("usa o modelo e a chave recebidos, sem valores fixos", () => {
    const r = montarRequisicao({ modelo: "MODELO_X", chave: "CHAVE_X", prompt: "oi" });
    const corpo = JSON.parse(r.init.body);
    expect(corpo.model).toBe("MODELO_X");
    expect(corpo.messages[0].content).toBe("oi");
    expect(r.init.headers["x-api-key"]).toBe("CHAVE_X");
  });
});

describe("extrairTexto", () => {
  it("junta blocos de texto", () => {
    expect(extrairTexto({ content: [{ type: "text", text: "a" }, { type: "x" }, { type: "text", text: "b" }] })).toBe("a\nb");
  });
  it("devolve null em formato inesperado", () => {
    expect(extrairTexto({})).toBeNull();
    expect(extrairTexto({ content: [] })).toBeNull();
  });
});
