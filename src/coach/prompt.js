/**
 * Prompt de análise: texto fixo, fornecido pela dona do produto.
 *
 * PENDENTE: o texto oficial ainda não foi enviado. Enquanto PROMPT_PENDENTE for true, a
 * aba Agile Coach mostra um aviso. Para concluir, troque PROMPT_ANALISE pelo texto final
 * (mantendo o marcador {{PACOTE_JSON}} onde o pacote deve entrar) e mude PROMPT_PENDENTE
 * para false. Nenhuma outra parte do app precisa mudar.
 */

export const MARCADOR_PACOTE = "{{PACOTE_JSON}}";

export const PROMPT_PENDENTE = true;

export const PROMPT_ANALISE = `[TEXTO DO PROMPT DE ANÁLISE PENDENTE]

Pacote de contexto:
${MARCADOR_PACOTE}`;

/** Troca o marcador pelo pacote. Usa split/join para o texto do pacote nunca ser lido como padrão. */
export function montarPrompt(pacoteTexto, modelo = PROMPT_ANALISE) {
  return modelo.split(MARCADOR_PACOTE).join(pacoteTexto);
}
