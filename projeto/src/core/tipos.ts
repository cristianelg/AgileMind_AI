export type TipoItem = "história" | "bug";
export type StatusItem = "Backlog" | "Em andamento" | "Code Review" | "Teste" | "Concluído";
export type SimNao = "sim" | "nao";

/** Item do time, no formato do modelo de dados (colunas do CSV). Datas em AAAA-MM-DD. */
export interface Item {
  id: string;
  time: string;
  tipo: TipoItem;
  titulo: string;
  status: StatusItem;
  criado_em: string;
  iniciado_em: string | null;
  concluido_em: string | null;
  bloqueado: SimNao;
  bloqueado_desde: string | null;
  story_points: number | null;
  adicionado_apos_inicio: SimNao;
}

export type Severidade = "alta" | "media";
