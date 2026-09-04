import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { parceiros_leads } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
import { requireAuth, requireTenantAccess, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

// ─── Parceiros cadastrados (placeholder — sem parceiros reais ainda) ──────────
export const PARCEIROS_CATALOGO = [
  {
    id: "contador",
    nome: "Contador / BPO Fiscal",
    categoria: "Contabilidade",
    descricao: "Escritórios contábeis especializados no setor têxtil",
    url: "https://wa.me/5511999999999?text=Quero+indicacao+de+contador+especializado+em+confeccao.+Vim+pelo+Mirage+Hub.",
    icone: "Receipt",
    cor: "blue",
    ativo: true,
  },
  {
    id: "marketing",
    nome: "Marketing & Performance",
    categoria: "Marketing",
    descricao: "Agências de marketing especializadas em moda e confecção",
    url: "https://wa.me/5511999999999?text=Quero+indicacao+de+agencia+de+marketing+para+confeccao.+Vim+pelo+Mirage+Hub.",
    icone: "TrendingUp",
    cor: "orange",
    ativo: true,
  },
  {
    id: "consultoria",
    nome: "Consultoria de Gestão",
    categoria: "Consultoria",
    descricao: "Consultores especializados em escalar confecções",
    url: "https://wa.me/5511999999999?text=Quero+indicacao+de+consultoria+de+gestao+para+confeccao.+Vim+pelo+Mirage+Hub.",
    icone: "Briefcase",
    cor: "violet",
    ativo: true,
  },
];

// ─── GET /parceiros ───────────────────────────────────────────────────────────
router.get("/parceiros", requireAuth, requireTenantAccess, (_req, res) => {
  res.json(PARCEIROS_CATALOGO.filter(p => p.ativo));
});

// ─── GET /parceiros/click/:partnerId ─────────────────────────────────────────
// Registra o clique e redireciona para o parceiro com parâmetros de rastreio
router.get("/parceiros/click/:partnerId", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { partnerId } = req.params;
  const rawTid = req.tenantId!;
  const tid = Array.isArray(rawTid) ? rawTid[0] : rawTid;
  const rawId = req.user?.id;
  const userId = Array.isArray(rawId) ? rawId[0] : rawId;
  const rawEmail = req.user?.email;
  const userEmail = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;

  const parceiro = PARCEIROS_CATALOGO.find(p => p.id === partnerId);
  if (!parceiro) { res.status(404).json({ error: "Parceiro não encontrado" }); return; }

  // Busca o nome do tenant para o cupom
  let tenantName = "";
  try {
    const tenantRow = await db.execute(sql`SELECT name, slug FROM tenants WHERE id = ${tid} LIMIT 1`);
    const t = (tenantRow.rows as any[])[0];
    tenantName = t?.name ?? t?.slug ?? tid.slice(0, 8);
  } catch { /* ignora */ }

  // Gera cupom no formato MIRAGE-{SLUG}
  const cupomBase = tenantName
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 20);
  const cupom = `MIRAGE-${cupomBase}`;

  // Registra o lead
  try {
    const leadRow = {
      tenant_id: String(tid),
      user_id: userId != null ? String(userId) : undefined,
      user_email: userEmail != null ? String(userEmail) : undefined,
      tenant_name: tenantName || undefined,
      partner_id: String(partnerId),
      partner_name: String(parceiro.nome),
      cupom: String(cupom),
    };
    await db.insert(parceiros_leads).values(leadRow);
  } catch (err) {
    // Não bloqueia o redirecionamento se falhar ao gravar
    req.log?.warn({ err }, "Falha ao gravar parceiro_lead");
  }

  // Monta URL de redirecionamento com UTM + cupom
  const separator = parceiro.url.includes("?") ? "&" : "?";
  const redirectUrl = `${parceiro.url}${separator}utm_source=mirage_hub&utm_medium=referral&utm_campaign=partners&cupom=${encodeURIComponent(cupom)}`;

  res.json({ redirect: redirectUrl, cupom });
});

// ─── GET /admin/parceiros/leads ───────────────────────────────────────────────
// Super admin: todos os leads de todos os tenants
router.get("/admin/parceiros/leads", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (req.user?.email !== "clovisart13@gmail.com") {
    res.status(403).json({ error: "Acesso negado" }); return;
  }

  const [leads, porParceiro] = await Promise.all([
    db.select().from(parceiros_leads)
      .orderBy(desc(parceiros_leads.created_at))
      .limit(200),
    db.select({
      partner_id: parceiros_leads.partner_id,
      partner_name: parceiros_leads.partner_name,
      total: count(),
    })
      .from(parceiros_leads)
      .groupBy(parceiros_leads.partner_id, parceiros_leads.partner_name)
      .orderBy(desc(count())),
  ]);

  const totalLeads = leads.length;
  const tenantsUnicos = new Set(leads.map(l => l.tenant_id)).size;

  res.json({ leads, porParceiro, totalLeads, tenantsUnicos });
});

export default router;
