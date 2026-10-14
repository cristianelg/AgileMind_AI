import { CONFIG_PADRAO } from "./regras.js";

export const TEXTOS_PADRAO = {
  limiteWip: String(CONFIG_PADRAO.limiteWip),
  fatorAlta: "1,5",
  diasBloqueio: String(CONFIG_PADRAO.diasBloqueio),
  percentualBugs: String(CONFIG_PADRAO.percentualBugs),
};

const CAMPOS = {
  limiteWip: {
    valido: (t) => /^[1-9]\d{0,2}$/.test(t),
    ler: Number,
    erro: "Informe um número inteiro de 1 a 999.",
  },
  fatorAlta: {
    valido: (t) => /^\d{1,2}([.,]\d{1,2})?$/.test(t) && Number(t.replace(",", ".")) >= 1,
    ler: (t) => Number(t.replace(",", ".")),
    erro: "Informe um número a partir de 1, com vírgula se precisar (ex.: 1,5).",
  },
  diasBloqueio: {
    valido: (t) => /^\d{1,3}$/.test(t),
    ler: Number,
    erro: "Informe um número inteiro de 0 a 999.",
  },
  percentualBugs: {
    valido: (t) => /^\d{1,2}$/.test(t),
    ler: Number,
    erro: "Informe um número inteiro de 0 a 99.",
  },
};

/**
 * Converte os textos digitados nos campos do painel "Regras" em números.
 * Campo inválido usa o valor padrão e entra em `erros`, para a tela avisar.
 */
export function lerConfig(textos) {
  const config = {};
  const erros = {};
  for (const [campo, regra] of Object.entries(CAMPOS)) {
    const texto = String(textos[campo] ?? "").trim();
    if (regra.valido(texto)) {
      config[campo] = regra.ler(texto);
    } else {
      config[campo] = CONFIG_PADRAO[campo];
      erros[campo] = regra.erro;
    }
  }
  return { config, erros };
}
