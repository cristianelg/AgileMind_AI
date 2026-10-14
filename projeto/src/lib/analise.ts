import { supabase } from "./supabase";

/** Chama a Edge Function. O front-end envia só o pacote já calculado; a chave do modelo nunca passa por aqui. */
export async function analisar(orgId: string, pacote: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.functions.invoke("analisar", { body: { org_id: orgId, pacote } });
  if (error) throw new Error(error.message);
  return (data as { texto: string }).texto;
}
