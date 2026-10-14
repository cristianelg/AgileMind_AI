import { diaDoCalendario } from "../metricas/datas.js";

export const COLUNAS_MODELO = [
  "id",
  "time",
  "tipo",
  "titulo",
  "status",
  "criado_em",
  "iniciado_em",
  "concluido_em",
  "bloqueado",
  "bloqueado_desde",
  "story_points",
  "adicionado_apos_inicio",
];

export const TIPOS_VALIDOS = ["história", "bug"];
export const STATUS_VALIDOS = ["Backlog", "Em andamento", "Code Review", "Teste", "Concluído"];
const SIM_NAO = ["sim", "nao"];

/** Divide uma linha em células. Aceita campos entre aspas (com separador dentro). */
function dividirLinha(linha, sep) {
  const celulas = [];
  let atual = "";
  let entreAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (entreAspas) {
      if (c === '"' && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else if (c === '"') {
        entreAspas = false;
      } else {
        atual += c;
      }
    } else if (c === '"') {
      entreAspas = true;
    } else if (c === sep) {
      celulas.push(atual);
      atual = "";
    } else {
      atual += c;
    }
  }
  if (entreAspas) return null;
  celulas.push(atual);
  return celulas.map((v) => v.trim());
}

/** Vírgula ou ponto e vírgula (Excel em pt-BR exporta com ponto e vírgula), pelo cabeçalho. */
function detectarSeparador(cabecalho) {
  const virgulas = cabecalho.split(",").length;
  const pontoVirgulas = cabecalho.split(";").length;
  return pontoVirgulas > virgulas ? ";" : ",";
}

/** Devolve null se a data é válida (formato e existência), senão o motivo. */
function problemaDeData(campo, valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return `${campo} fora do formato AAAA-MM-DD ("${valor}")`;
  try {
    diaDoCalendario(valor);
  } catch {
    return `${campo} não existe no calendário ("${valor}")`;
  }
  return null;
}

function validarLinha(obj) {
  const motivos = [];
  const vazio = (v) => v === null || v === "";

  if (vazio(obj.id)) motivos.push("id vazio");
  if (vazio(obj.time)) motivos.push("time vazio");

  if (vazio(obj.tipo)) motivos.push("tipo vazio");
  else if (!TIPOS_VALIDOS.includes(obj.tipo))
    motivos.push(`tipo "${obj.tipo}" inválido (use ${TIPOS_VALIDOS.join(" ou ")})`);

  if (vazio(obj.status)) motivos.push("status vazio");
  else if (!STATUS_VALIDOS.includes(obj.status))
    motivos.push(`status "${obj.status}" inválido (use ${STATUS_VALIDOS.join(", ")})`);

  for (const campo of ["bloqueado", "adicionado_apos_inicio"]) {
    if (vazio(obj[campo])) motivos.push(`${campo} vazio (use sim ou nao)`);
    else if (!SIM_NAO.includes(obj[campo])) motivos.push(`${campo} "${obj[campo]}" inválido (use sim ou nao)`);
  }

  const datasOk = {};
  for (const campo of ["criado_em", "iniciado_em", "concluido_em", "bloqueado_desde"]) {
    const v = obj[campo];
    if (vazio(v)) {
      if (campo === "criado_em") motivos.push("criado_em vazio");
      continue;
    }
    const problema = problemaDeData(campo, v);
    if (problema) motivos.push(problema);
    else datasOk[campo] = diaDoCalendario(v);
  }

  if (!vazio(obj.concluido_em) && vazio(obj.iniciado_em)) {
    motivos.push("concluido_em preenchido sem iniciado_em");
  }
  const { criado_em: c, iniciado_em: i, concluido_em: f } = datasOk;
  if (c !== undefined && i !== undefined && c > i) motivos.push("criado_em depois de iniciado_em");
  if (i !== undefined && f !== undefined && i > f) motivos.push("iniciado_em depois de concluido_em");
  if (c !== undefined && i === undefined && f !== undefined && c > f)
    motivos.push("criado_em depois de concluido_em");

  if (obj.bloqueado === "sim" && vazio(obj.bloqueado_desde)) {
    motivos.push("bloqueado = sim exige bloqueado_desde");
  }
  if (obj.bloqueado === "nao" && !vazio(obj.bloqueado_desde)) {
    motivos.push("bloqueado_desde preenchido com bloqueado = nao");
  }
  const b = datasOk.bloqueado_desde;
  if (b !== undefined && c !== undefined && b < c) motivos.push("bloqueado_desde antes de criado_em");
  if (b !== undefined && f !== undefined && b > f) motivos.push("bloqueado_desde depois de concluido_em");

  // Coerência entre status e datas: o WIP e o aging dependem das datas, não do status.
  const iniciado = !vazio(obj.iniciado_em);
  const concluido = !vazio(obj.concluido_em);
  if (STATUS_VALIDOS.includes(obj.status)) {
    if (obj.status === "Concluído" && !concluido) motivos.push("status Concluído exige concluido_em");
    if (obj.status !== "Concluído" && concluido) motivos.push(`concluido_em preenchido com status ${obj.status}`);
    if (obj.status === "Backlog" && iniciado) motivos.push("status Backlog com iniciado_em preenchido");
    if (["Em andamento", "Code Review", "Teste", "Concluído"].includes(obj.status) && !iniciado)
      motivos.push(`status ${obj.status} exige iniciado_em`);
  }

  if (!vazio(obj.story_points)) {
    const n = Number(obj.story_points);
    if (!Number.isFinite(n) || n < 0) motivos.push(`story_points "${obj.story_points}" não é um número válido`);
  }

  return motivos;
}

/**
 * Valida o texto de um CSV, linha a linha.
 *
 * Devolve:
 *  - erro: texto quando o arquivo inteiro é recusado (vazio ou cabeçalho incompleto), senão null
 *  - colunasFaltando: colunas do modelo ausentes no cabeçalho
 *  - itens: linhas válidas, no mesmo formato de parseCsv (vazio vira null, story_points número)
 *  - invalidas: [{ linha, id, motivos }], com `linha` contada no arquivo (cabeçalho é a linha 1)
 *  - total: linhas de dados lidas (em branco não contam)
 *  - ignoradas: colunas extras no cabeçalho, que não entram nos cálculos
 *
 * Nenhuma linha é descartada em silêncio: ou entra em `itens` ou aparece em `invalidas`.
 */
export function validarCsv(texto) {
  const resultado = { erro: null, colunasFaltando: [], itens: [], invalidas: [], total: 0, ignoradas: [] };
  const linhas = String(texto ?? "").replace(/^﻿/, "").split(/\r?\n/);
  const posCabecalho = linhas.findIndex((l) => l.trim() !== "");
  if (posCabecalho === -1) {
    resultado.erro = "O CSV está vazio.";
    return resultado;
  }

  const sep = detectarSeparador(linhas[posCabecalho]);
  const colunas = dividirLinha(linhas[posCabecalho], sep) ?? [];
  resultado.colunasFaltando = COLUNAS_MODELO.filter((c) => !colunas.includes(c));
  resultado.ignoradas = colunas.filter((c) => c !== "" && !COLUNAS_MODELO.includes(c));
  if (resultado.colunasFaltando.length > 0) {
    resultado.erro = `Cabeçalho incompleto. Faltam: ${resultado.colunasFaltando.join(", ")}.`;
    return resultado;
  }

  const vistos = new Set();
  for (let n = posCabecalho + 1; n < linhas.length; n++) {
    if (linhas[n].trim() === "") continue;
    resultado.total++;
    const celulas = dividirLinha(linhas[n], sep);
    const numeroDaLinha = n + 1;
    const idBruto = celulas ? (celulas[colunas.indexOf("id")] ?? "") : "";

    if (celulas === null) {
      resultado.invalidas.push({ linha: numeroDaLinha, id: idBruto || null, motivos: ["aspas não fechadas"] });
      continue;
    }
    if (celulas.length !== colunas.length) {
      resultado.invalidas.push({
        linha: numeroDaLinha,
        id: idBruto || null,
        motivos: [`${celulas.length} colunas, o cabeçalho tem ${colunas.length}`],
      });
      continue;
    }

    const obj = {};
    colunas.forEach((col, i) => {
      if (!COLUNAS_MODELO.includes(col)) return;
      obj[col] = celulas[i] === "" ? null : celulas[i];
    });

    const motivos = validarLinha(obj);
    if (obj.id && vistos.has(obj.id)) motivos.push(`id repetido (já usado em linha anterior)`);

    if (motivos.length > 0) {
      resultado.invalidas.push({ linha: numeroDaLinha, id: obj.id, motivos });
      continue;
    }
    vistos.add(obj.id);
    obj.story_points = obj.story_points === null ? null : Number(obj.story_points);
    resultado.itens.push(obj);
  }

  if (resultado.total === 0) resultado.erro = "O CSV tem cabeçalho, mas nenhuma linha de dados.";
  return resultado;
}
