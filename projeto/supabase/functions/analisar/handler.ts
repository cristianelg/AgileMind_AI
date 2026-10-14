// Lógica pura da função "analisar". Sem Deno, sem rede: testável no Node (Vitest).
import { MARCADOR_PACOTE } from "./prompt";

export const LIMITE_PACOTE_BYTES = 60_000;
export const MAX_TOKENS_RESPOSTA = 2000;

// CONFERIR NA DOCUMENTAÇÃO ATUAL da Anthropic antes de usar: endpoint, valor de anthropic-version
// e nome do modelo. O modelo NÃO tem valor fixo no código: vem do secret MODELO_IA.
export const ENDPOINT_MENSAGENS = "https://api.anthropic.com/v1/messages";
export const VERSAO_API = "2023-06-01";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Entrada = { ok: true; orgId: string; pacoteTexto: string } | { ok: false; status: number; erro: string };

export function validarEntrada(corpo: unknown): Entrada {
  if (typeof corpo !== "object" || corpo === null) return { ok: false, status: 400, erro: "Corpo inválido." };
  const { org_id, pacote } = corpo as { org_id?: unknown; pacote?: unknown };
  if (typeof org_id !== "string" || !UUID.test(org_id)) return { ok: false, status: 400, erro: "org_id inválido." };
  if (typeof pacote !== "object" || pacote === null || Array.isArray(pacote))
    return { ok: false, status: 400, erro: "pacote deve ser um objeto JSON." };
  const pacoteTexto = JSON.stringify(pacote, null, 2);
  if (new TextEncoder().encode(pacoteTexto).length > LIMITE_PACOTE_BYTES)
    return { ok: false, status: 413, erro: "Pacote maior que o limite permitido." };
  return { ok: true, orgId: org_id, pacoteTexto };
}

/** split/join: o texto do pacote nunca é lido como padrão de substituição. */
export function montarPrompt(modelo: string, pacoteTexto: string): string {
  return modelo.split(MARCADOR_PACOTE).join(pacoteTexto);
}

export function montarRequisicao(opts: { modelo: string; chave: string; prompt: string }) {
  return {
    url: ENDPOINT_MENSAGENS,
    init: {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": opts.chave, "anthropic-version": VERSAO_API },
      body: JSON.stringify({
        model: opts.modelo,
        max_tokens: MAX_TOKENS_RESPOSTA,
        messages: [{ role: "user", content: opts.prompt }],
      }),
    },
  };
}

/** Extrai o texto da resposta. Formato esperado: { content: [{ type: "text", text }] } (conferir na doc). */
export function extrairTexto(resposta: unknown): string | null {
  const conteudo = (resposta as { content?: unknown })?.content;
  if (!Array.isArray(conteudo)) return null;
  const partes = conteudo
    .filter((c): c is { type: string; text: string } => c?.type === "text" && typeof c.text === "string")
    .map((c) => c.text);
  return partes.length ? partes.join("\n") : null;
}
