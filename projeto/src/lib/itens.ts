import type { Item } from "../core";
import { parseCsv } from "../core";
import csvDemo from "../../dados/itens_demo.csv?raw";
import { supabase } from "./supabase";

export const ROTULO_DEMO = "Dados demonstrativos";

interface LinhaItem {
  codigo: string; time: string; tipo: Item["tipo"]; titulo: string; status: Item["status"];
  criado_em: string; iniciado_em: string | null; concluido_em: string | null;
  bloqueado: Item["bloqueado"]; bloqueado_desde: string | null; story_points: number | null;
  adicionado_apos_inicio: Item["adicionado_apos_inicio"]; origem: string;
}

const dbParaItem = (l: LinhaItem): Item => ({
  id: l.codigo, time: l.time, tipo: l.tipo, titulo: l.titulo, status: l.status,
  criado_em: l.criado_em, iniciado_em: l.iniciado_em, concluido_em: l.concluido_em,
  bloqueado: l.bloqueado, bloqueado_desde: l.bloqueado_desde,
  story_points: l.story_points === null ? null : Number(l.story_points),
  adicionado_apos_inicio: l.adicionado_apos_inicio,
});

export async function listarItens(orgId: string): Promise<{ itens: Item[]; demo: boolean }> {
  const { data, error } = await supabase.from("itens").select("*").eq("org_id", orgId).order("codigo");
  if (error) throw new Error(error.message);
  const linhas = (data ?? []) as LinhaItem[];
  return { itens: linhas.map(dbParaItem), demo: linhas.length > 0 && linhas.every((l) => l.origem === "demonstrativo") };
}

/** Grava os 29 itens do CSV de exemplo marcados como origem 'demonstrativo'. Exige papel dono/admin (RLS). */
export async function carregarDemonstrativos(orgId: string): Promise<void> {
  const linhas = parseCsv(csvDemo).map(({ id, ...resto }) => ({ ...resto, codigo: id, org_id: orgId, origem: "demonstrativo" }));
  const { error } = await supabase.from("itens").upsert(linhas, { onConflict: "org_id,codigo" });
  if (error) throw new Error(error.message);
}
