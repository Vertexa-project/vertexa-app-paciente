import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";

/**
 * Quantos vínculos ATIVOS a paciente tem no próprio cadastro (WP-APP-7 item 2.4).
 *
 * PARA QUE SERVE: separar duas ausências que o Perfil vinha misturando numa só. O NOME do
 * profissional sai da RPC `channel_professionals`, que depende de existir `chat_channels` —
 * criado por `get_or_create_channel`, que o app do PACIENTE nunca chama (quem chama é o
 * painel, ao abrir a conversa). Então "sem nome" hoje pode ser duas coisas muito diferentes:
 * ela TEM profissional e ninguém abriu a conversa, ou ela não tem vínculo nenhum. A segunda
 * é uma afirmação séria, e o app só pode fazê-la se souber.
 *
 * ELA PODE LER ISSO, e a policy é explícita: `ppl_select` tem o ramo
 * `private.is_self_patient(patient_id)`, que é
 * `exists(select 1 from patients pt where pt.id = p_patient and pt.profile_id = current_profile_id())`.
 * Nenhuma migration, nenhuma policy nova, nenhuma RPC nova.
 *
 * ⚠️ FILTRA POR `patient_id` DE PROPÓSITO, e não confia na RLS para restringir as linhas.
 * `ppl_select` tem outros dois ramos (`owns_professional`, `is_clinic_admin`) — um profile
 * que também fosse profissional ou admin veria vínculos de OUTROS pacientes num select sem
 * filtro. Hoje isso é vazio em produção (nenhum profile de paciente é profissional nem dono
 * de clínica), mas contar linha de terceiro como "vínculo dela" é o tipo de erro que não dá
 * sinal nenhum quando acontece.
 *
 * ⚠️ TAMBÉM NÃO USA EMBED (`patients!inner(profile_id)`), que resolveria em uma chamada só:
 * se o embed deixasse de passar a RLS, `!inner` derruba as linhas e devolve `[]` SEM ERRO —
 * e aqui `[]` viraria a afirmação "você não tem profissional". É exatamente a forma
 * silenciosa que este projeto já pagou caro para descobrir.
 *
 * `null` = NÃO DEU PARA SABER (sem patients.id resolvido). Nunca 0 nesse caso: 0 é uma
 * afirmação, e quem chama a usa para dizer que não há vínculo. Erro de leitura PROPAGA,
 * pelo mesmo motivo.
 */
export async function countMyActiveProfessionalLinks(): Promise<number | null> {
  const patientId = await getMyPatientId();
  if (!patientId) return null;

  const { data, error } = await supabase
    .from("professional_patient_links")
    .select("id, status")
    .eq("patient_id", patientId);

  if (error) throw error;

  // `status` é nullable com default 'active' — o banco trata ausência como ativo
  // (`coalesce(status,'active') = 'active'` em get_or_create_channel). Espelhado aqui.
  const rows = (data ?? []) as { id: string; status: string | null }[];
  return rows.filter((r) => (r.status ?? "active") === "active").length;
}
