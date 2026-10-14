// Prompt de análise. Texto oficial AINDA NÃO FOI ENVIADO pela dona do produto.
// Enquanto PROMPT_PENDENTE for true, a função recusa a chamada (falha fechada) em vez de
// mandar ao modelo um texto provisório. Para concluir: cole o texto em PROMPT_ANALISE, mantendo
// {{PACOTE_JSON}} onde o pacote entra, e mude PROMPT_PENDENTE para false.
export const MARCADOR_PACOTE = "{{PACOTE_JSON}}";
export const PROMPT_PENDENTE = true;
export const PROMPT_ANALISE = `[TEXTO DO PROMPT DE ANÁLISE PENDENTE]

Pacote de contexto:
${MARCADOR_PACOTE}`;
