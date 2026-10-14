import { createClient } from "@supabase/supabase-js";

// Só URL e chave PUBLICÁVEL (ou anon, conforme a versão do Supabase) vão para o front-end.
// A segurança vem da RLS. Nunca use aqui a chave de serviço (service_role/secret) nem chave de IA.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const configurado = Boolean(url && chave);
export const supabase = createClient(url ?? "http://localhost:54321", chave ?? "sem-chave");
