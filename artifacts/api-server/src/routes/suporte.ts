import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireAuth, requireSuperAdmin, type AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

router.get("/suporte/chamadas", requireSuperAdmin as any, async (req, res) => {
  const { status } = req.query;
  let query = supabaseAdmin
    .from("suporte_chamadas")
    .select("*")
    .order("criado_em", { ascending: false });
  if (status && status !== "todos") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post("/suporte/chamadas", requireAuth as any, async (req: AuthenticatedRequest, res) => {
  const { assunto, descricao, prioridade, categoria } = req.body;
  if (!assunto) return res.status(400).json({ error: "Assunto obrigatório" });

  const { data: tuData } = await supabaseAdmin
    .from("tenant_users")
    .select("tenant_id, tenants(name)")
    .eq("user_id", req.user!.id)
    .maybeSingle();

  const tenantRaw = tuData?.tenants as any;
  const tenantName = Array.isArray(tenantRaw)
    ? tenantRaw[0]?.name
    : tenantRaw?.name ?? "Desconhecido";

  const { data, error } = await supabaseAdmin
    .from("suporte_chamadas")
    .insert({
      tenant_id: tuData?.tenant_id ?? null,
      tenant_name: tenantName,
      user_email: req.user!.email ?? null,
      assunto,
      descricao: descricao ?? null,
      prioridade: prioridade ?? "media",
      categoria: categoria ?? "suporte",
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch("/suporte/chamadas/:id", requireSuperAdmin as any, async (req, res) => {
  const { status, notas_admin, prioridade } = req.body;
  const updates: Record<string, any> = { atualizado_em: new Date().toISOString() };
  if (status) updates.status = status;
  if (notas_admin !== undefined) updates.notas_admin = notas_admin;
  if (prioridade) updates.prioridade = prioridade;
  if (status === "resolvido") updates.resolvido_em = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("suporte_chamadas")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
