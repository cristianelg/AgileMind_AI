/**
 * Plano de ação PDCA sobre um risco. Funções puras, sem IA.
 * Os planos ficam no estado da página e se perdem ao recarregar.
 */

export const STATUS_FAZER = ["Não iniciado", "Em andamento", "Concluído"];

export const DECISOES_AGIR = [
  { valor: "padronizar", rotulo: "Padronizar" },
  { valor: "ajustar", rotulo: "Ajustar" },
  { valor: "abandonar", rotulo: "Abandonar" },
];

export const PLANO_VAZIO = {
  riscoChave: "",
  acao: "",
  responsavel: "",
  prazo: "",
  criterio: "",
  statusFazer: STATUS_FAZER[0],
  metrica: "",
  dataChecagem: "",
  decisaoAgir: "",
};

const temNumero = (texto) => /\d/.test(texto) || /\bzero\b/i.test(texto);

/**
 * Valida o formulário. Devolve { campo: mensagem } para cada problema.
 * Planejar e Checar são obrigatórios; Fazer começa em "Não iniciado" e Agir só se decide depois da checagem.
 * "Mensurável" é checado de forma simples: o critério precisa ter um número ou "zero".
 * Isso não garante que o critério seja bom, só barra o que é claramente vago.
 */
export function validarPlano(plano) {
  const erros = {};
  const vazio = (v) => !String(v ?? "").trim();
  if (vazio(plano.riscoChave)) erros.riscoChave = "Escolha o risco.";
  if (vazio(plano.acao)) erros.acao = "Descreva a ação.";
  if (vazio(plano.responsavel)) erros.responsavel = "Informe o responsável.";
  if (vazio(plano.prazo)) erros.prazo = "Informe o prazo.";
  if (vazio(plano.criterio)) erros.criterio = "Informe o critério de sucesso.";
  else if (!temNumero(plano.criterio))
    erros.criterio = "Torne o critério mensurável, com um número (ex.: aging abaixo de 6 dias).";
  if (vazio(plano.metrica)) erros.metrica = "Informe a métrica a observar.";
  if (vazio(plano.dataChecagem)) erros.dataChecagem = "Informe a data da checagem.";
  else if (!vazio(plano.prazo) && plano.dataChecagem < plano.prazo)
    erros.dataChecagem = "A checagem deve ser no prazo ou depois dele.";
  return erros;
}
