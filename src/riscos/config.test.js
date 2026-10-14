import test from "node:test";
import assert from "node:assert/strict";
import { lerConfig, TEXTOS_PADRAO } from "./config.js";

test("textos padrão viram a configuração padrão, sem erros", () => {
  const { config, erros } = lerConfig(TEXTOS_PADRAO);
  assert.deepEqual(config, { limiteWip: 5, fatorAlta: 1.5, diasBloqueio: 2, percentualBugs: 50 });
  assert.deepEqual(erros, {});
});

test("aceita vírgula ou ponto no fator", () => {
  assert.equal(lerConfig({ ...TEXTOS_PADRAO, fatorAlta: "2,25" }).config.fatorAlta, 2.25);
  assert.equal(lerConfig({ ...TEXTOS_PADRAO, fatorAlta: "2.25" }).config.fatorAlta, 2.25);
});

test("valor inválido usa o padrão e vira erro, nunca é aceito em silêncio", () => {
  const { config, erros } = lerConfig({ limiteWip: "0", fatorAlta: "0,5", diasBloqueio: "-1", percentualBugs: "abc" });
  assert.deepEqual(config, { limiteWip: 5, fatorAlta: 1.5, diasBloqueio: 2, percentualBugs: 50 });
  assert.deepEqual(Object.keys(erros).sort(), ["diasBloqueio", "fatorAlta", "limiteWip", "percentualBugs"]);
});

test("zero dias de bloqueio é permitido", () => {
  assert.equal(lerConfig({ ...TEXTOS_PADRAO, diasBloqueio: "0" }).config.diasBloqueio, 0);
});
