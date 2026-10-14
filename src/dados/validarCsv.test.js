import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validarCsv, COLUNAS_MODELO } from "./validarCsv.js";

const CAB = COLUNAS_MODELO.join(",");
const ok = "A-1,T,história,Ok,Concluído,2026-09-01,2026-09-02,2026-09-05,nao,,3,nao";
const csv = (...linhas) => [CAB, ...linhas].join("\n");
const motivosDe = (linha) => validarCsv(csv(linha)).invalidas[0]?.motivos.join(" | ");

test("CSV demonstrativo entra inteiro, sem linhas inválidas", () => {
  const r = validarCsv(readFileSync(new URL("../../dados/itens_demo.csv", import.meta.url), "utf8"));
  assert.equal(r.erro, null);
  assert.equal(r.itens.length, 29);
  assert.equal(r.invalidas.length, 0);
});

test("cabeçalho incompleto recusa o arquivo e lista as colunas", () => {
  const r = validarCsv("id,time,tipo\nA,T,bug");
  assert.match(r.erro, /Faltam: titulo, status/);
  assert.equal(r.itens.length, 0);
});

test("linha válida vira objeto com null e story_points numérico", () => {
  const r = validarCsv(csv(ok));
  assert.equal(r.itens[0].bloqueado_desde, null);
  assert.equal(r.itens[0].story_points, 3);
});

test("regras por linha", () => {
  assert.match(motivosDe(ok.replace("2026-09-01", "01/09/2026")), /criado_em fora do formato/);
  assert.match(motivosDe(ok.replace("2026-09-05", "2026-02-31")), /não existe no calendário/);
  assert.match(motivosDe(ok.replace("2026-09-01", "2026-09-03")), /criado_em depois de iniciado_em/);
  assert.match(motivosDe(ok.replace("2026-09-05", "2026-09-01")), /iniciado_em depois de concluido_em/);
  assert.match(motivosDe(ok.replace(",2026-09-02,", ",,")), /concluido_em preenchido sem iniciado_em/);
  assert.match(motivosDe(ok.replace(",nao,,3", ",sim,,3")), /exige bloqueado_desde/);
  assert.match(motivosDe(ok.replace("história", "tarefa")), /tipo "tarefa" inválido/);
  assert.match(motivosDe(ok.replace("Concluído", "Feito")), /status "Feito" inválido/);
  assert.match(motivosDe(ok.replace(",3,nao", ",abc,nao")), /story_points/);
});

test("várias falhas na mesma linha aparecem juntas", () => {
  const r = validarCsv(csv(ok.replace("história", "x").replace("Concluído", "y")));
  assert.equal(r.invalidas[0].motivos.length, 2);
});

test("número da linha conta o cabeçalho como 1 e pula linhas em branco sem perder a contagem", () => {
  const r = validarCsv([CAB, ok, "", ok.replace("A-1", "A-2").replace("história", "x")].join("\n"));
  assert.equal(r.invalidas[0].linha, 4);
  assert.equal(r.invalidas[0].id, "A-2");
  assert.equal(r.total, 2);
});

test("nenhuma linha some: válidas + inválidas = total", () => {
  const r = validarCsv(csv(ok, ok.replace("A-1", "A-2"), "A-3,T,bug", ok.replace("A-1", "A-4").replace("nao,,3", "sim,,3")));
  assert.equal(r.itens.length + r.invalidas.length, r.total);
  assert.equal(r.itens.length, 2);
});

test("id repetido: a segunda ocorrência é recusada", () => {
  const r = validarCsv(csv(ok, ok));
  assert.equal(r.itens.length, 1);
  assert.match(r.invalidas[0].motivos[0], /id repetido/);
});

test("ponto e vírgula, BOM, CRLF e campo entre aspas com vírgula", () => {
  const linha = ok.replace("Ok", '"Fix, de teste"');
  const texto = "﻿" + COLUNAS_MODELO.join(";") + "\r\n" + linha.replace(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g, ";") + "\r\n";
  const r = validarCsv(texto);
  assert.equal(r.invalidas.length, 0);
  assert.equal(r.itens[0].titulo, "Fix, de teste");
});

test("vazio e só cabeçalho", () => {
  assert.match(validarCsv("  \n").erro, /vazio/);
  assert.match(validarCsv(CAB).erro, /nenhuma linha de dados/);
});

test("linha com número de colunas diferente do cabeçalho", () => {
  assert.match(motivosDe("A-1,T,bug"), /3 colunas/);
});
