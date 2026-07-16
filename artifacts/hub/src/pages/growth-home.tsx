import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Eye, Megaphone, Users, GitMerge, Bot, Settings, BarChart3,
  ArrowLeft, Sparkles, ChevronRight, AlertCircle, RefreshCw,
  CheckCircle2, XCircle, Clock, Zap, MessageSquare, Activity,
  TrendingUp, UserCheck, UserX, Inbox, PhoneCall, Send, Hash,
  Plus, Pencil, Save, X, ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type TabId = "visao-geral" | "marketing" | "leads" | "funis" | "agentes" | "config-ia" | "insights";

interface CockpitLead {
  tenant_id: string; phone: string; lead_name: string | null;
  classificacao: string | null; human_in_control: boolean;
  human_agent_name: string | null; last_activity_at: string;
  passou_por_reeducacao: boolean; status: string;
  segmento: string | null; resumo: string | null;
}

interface FunilLead {
  tenant_id: string; id: string; lead_name: string | null; phone: string;
  pipeline_key: string | null; stage_key: string | null; status: string;
  canal: string | null; origem: string | null; responsavel_nome: string | null;
  created_at: string;
}

interface Campanha {
  id: string; tenant_id: string; name: string; objective: string | null;
  channel: string | null; source: string | null; angulo: string | null;
  oferta: string | null; status: string; observacoes: string | null;
  created_at: string; leads_gerados: number; leads_premium: number; leads_baixo_fit: number;
}

interface Agente {
  tenant_id: string; nome: string; canal: string; funcao: string;
  total_leads: number; leads_em_ia: number; leads_bloqueados_hic: number;
  liberado: boolean; ultima_atividade: string | null;
}

interface Classificacao { classificacao: string; count: number; }

interface InsightDia { day: string; classificacao: string; count: number; }

interface CockpitData {
  ok: boolean; tenant_filter: string | null;
  overview: {
    total_leads: number; active_campaigns: number;
    handoffs_abertos: number; leads_em_ia: number;
    classificacoes: Classificacao[]; agentes: Agente[];
  };
  leads: CockpitLead[];
  funil: FunilLead[];
  campanhas: Campanha[];
  insights: { classificacoes_por_dia: InsightDia[] };
}

interface AiConfig {
  tenant_id: string; brand_name: string | null; posicionamento: string | null;
  publico_alvo: string | null; segmentos: string | null;
  criterios_qualificacao: string | null; perguntas_obrigatorias: string | null;
  tom_voz: string | null; regras_handoff: string | null;
  pode_prometer: string | null; nao_pode_prometer: string | null;
  msg_baixo_fit: string | null; msg_encaminhamento: string | null;
  msg_reposicionamento_preco: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function fmtRelative(v: string | null) {
  if (!v) return "—";
  const diff = Date.now() - new Date(v).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

const CLF_META: Record<string, { label: string; color: string; bg: string }> = {
  fit_premium_pro:    { label: "Premium Pro",     color: "text-emerald-300",  bg: "bg-emerald-500/20" },
  fit_basico:         { label: "Básico",           color: "text-sky-300",      bg: "bg-sky-500/20" },
  reeducar_fit:       { label: "Reeducação",       color: "text-amber-300",    bg: "bg-amber-500/20" },
  nutricao:           { label: "Nutrição",         color: "text-violet-300",   bg: "bg-violet-500/20" },
  baixo_fit:          { label: "Baixo Fit",        color: "text-red-300",      bg: "bg-red-500/20" },
  encaminhar_suporte: { label: "Suporte",          color: "text-pink-300",     bg: "bg-pink-500/20" },
  em_qualificacao:    { label: "Em qualificação",  color: "text-gray-300",     bg: "bg-white/10" },
};

const CLF_CHART_COLORS: Record<string, string> = {
  fit_premium_pro: "#34d399", fit_basico: "#38bdf8",
  reeducar_fit: "#fbbf24", nutricao: "#a78bfa",
  baixo_fit: "#f87171", encaminhar_suporte: "#f472b6",
  em_qualificacao: "#9ca3af",
};

function ClfBadge({ clf }: { clf: string | null }) {
  const m = CLF_META[clf ?? "em_qualificacao"] ?? CLF_META.em_qualificacao;
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${m.bg} ${m.color}`}>
      {m.label}
    </span>
  );
}

// ── Componentes base ──────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, tone = "default", sub }: {
  icon: React.ElementType; label: string; value: string;
  tone?: "default" | "success" | "warning" | "danger"; sub?: string;
}) {
  const tones = {
    default: "text-white", success: "text-emerald-400",
    warning: "text-amber-400", danger: "text-red-400",
  };
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${tones[tone]}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, action }: {
  title: string; icon: React.ElementType; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function MiniTable<T>({ rows, cols, empty }: {
  rows: T[]; empty: string;
  cols: { h: string; cell: (r: T) => React.ReactNode; w?: string }[];
}) {
  if (rows.length === 0) return <p className="text-xs text-gray-500 text-center py-6">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/5">
            {cols.map((c) => (
              <th key={c.h} className={`text-left py-2 pr-4 text-gray-500 font-medium ${c.w ?? ""}`}>{c.h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
              {cols.map((c) => (
                <td key={c.h} className="py-2 pr-4 text-gray-300">{c.cell(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24">
      <RefreshCw className="w-5 h-5 text-gray-600 animate-spin" />
    </div>
  );
}

function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-3 py-12 justify-center text-red-400 text-sm">
      <AlertCircle className="w-4 h-4" /> {msg}
    </div>
  );
}

// ── Tab: Visão Geral ──────────────────────────────────────────────────────────

function TabVisaoGeral({ data }: { data: CockpitData }) {
  const { overview } = data;
  const total = overview.total_leads;
  const premium = overview.classificacoes.find((c) => c.classificacao === "fit_premium_pro")?.count ?? 0;
  const premiumRate = total > 0 ? Math.round((premium / total) * 100) : 0;
  const handoffRate = total > 0 ? Math.round((overview.handoffs_abertos / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Users} label="Total de leads" value={String(total)} />
        <KpiCard icon={CheckCircle2} label="Premium Pro" value={String(premium)}
          tone={premium > 0 ? "success" : "default"} sub={`${premiumRate}% do total`} />
        <KpiCard icon={UserX} label="Handoffs abertos" value={String(overview.handoffs_abertos)}
          tone={overview.handoffs_abertos > 0 ? "warning" : "success"} sub={`${handoffRate}% com humano`} />
        <KpiCard icon={Bot} label="Em IA (Joana)" value={String(overview.leads_em_ia)}
          tone="default" sub={`${overview.active_campaigns} campanhas ativas`} />
      </div>

      <SectionCard title="Distribuição por classificação" icon={BarChart3}>
        <div className="space-y-2">
          {overview.classificacoes
            .sort((a, b) => b.count - a.count)
            .map((c) => {
              const m = CLF_META[c.classificacao] ?? CLF_META.em_qualificacao;
              const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
              return (
                <div key={c.classificacao} className="flex items-center gap-3">
                  <span className={`text-[10px] w-28 shrink-0 font-medium ${m.color}`}>{m.label}</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${m.bg}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{c.count}</span>
                  <span className="text-[10px] text-gray-600 w-8 text-right">{pct}%</span>
                </div>
              );
            })}
          {overview.classificacoes.length === 0 && (
            <p className="text-xs text-gray-500 py-4 text-center">Nenhum lead qualificado ainda.</p>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Status dos agentes" icon={Bot}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {overview.agentes.map((a) => (
            <div key={a.tenant_id} className={`rounded-xl border p-4 ${a.liberado ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{a.nome} <span className="text-gray-500 font-normal text-xs">— {a.tenant_id}</span></p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{a.funcao} · {a.canal}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${a.liberado ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                  {a.liberado ? "operacional" : `${a.leads_bloqueados_hic} bloqueado(s)`}
                </span>
              </div>
              <div className="flex gap-4 mt-3">
                <span className="text-[11px] text-gray-500"><span className="text-white font-bold">{a.total_leads}</span> leads total</span>
                <span className="text-[11px] text-gray-500"><span className="text-emerald-400 font-bold">{a.leads_em_ia}</span> em IA</span>
                <span className="text-[11px] text-gray-500"><span className="text-amber-400 font-bold">{a.leads_bloqueados_hic}</span> c/ humano</span>
              </div>
              <p className="text-[10px] text-gray-600 mt-2">Última atividade: {fmtRelative(a.ultima_atividade)}</p>
            </div>
          ))}
          {overview.agentes.length === 0 && (
            <p className="text-xs text-gray-500 py-4">Nenhum lead registrado ainda.</p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

// ── Tab: Marketing ────────────────────────────────────────────────────────────

function TabMarketing({ data, onRefresh }: { data: CockpitData; onRefresh: () => void }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
    tenant_id: "r2pb", name: "", objective: "", channel: "", source: "", angulo: "", oferta: "", observacoes: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!form.name) { setMsg("Nome da campanha é obrigatório."); return; }
    setSaving(true);
    try {
      await apiFetch("/marketing/growth/campaigns-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setMsg("Campanha criada!");
      setShowNew(false);
      setForm({ tenant_id: "r2pb", name: "", objective: "", channel: "", source: "", angulo: "", oferta: "", observacoes: "" });
      onRefresh();
    } catch (err: any) {
      setMsg(err.message ?? "Erro ao salvar campanha");
    } finally {
      setSaving(false);
    }
  }, [form, onRefresh]);

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`text-xs px-4 py-2 rounded-lg ${msg.startsWith("Campanha") ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
          {msg}
        </div>
      )}

      <SectionCard title="Campanhas" icon={Megaphone}
        action={
          <button onClick={() => { setShowNew(!showNew); setMsg(null); }}
            className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300">
            <Plus className="w-3 h-3" /> Nova
          </button>
        }>

        {showNew && (
          <div className="bg-white/[0.04] rounded-xl p-4 mb-4 space-y-3 border border-violet-500/20">
            <p className="text-xs font-semibold text-violet-300 mb-2">Nova campanha</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: "name", label: "Nome *" },
                { k: "objective", label: "Objetivo" },
                { k: "channel", label: "Canal" },
                { k: "source", label: "Source / UTM" },
              ].map(({ k, label }) => (
                <div key={k}>
                  <label className="text-[10px] text-gray-500 block mb-1">{label}</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
                    value={form[k] ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Ângulo criativo</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
                value={form.angulo ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, angulo: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Oferta principal</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
                value={form.oferta ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, oferta: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Observações</label>
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50 resize-none"
                rows={2}
                value={form.observacoes ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNew(false)} className="text-xs text-gray-500 hover:text-white px-3 py-1.5 rounded-lg border border-white/10">
                Cancelar
              </button>
              <button disabled={saving} onClick={handleSave}
                className="flex items-center gap-1 text-xs bg-violet-600 hover:bg-violet-500 text-white px-4 py-1.5 rounded-lg disabled:opacity-50">
                <Save className="w-3 h-3" /> {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        )}

        <MiniTable
          rows={data.campanhas}
          empty="Nenhuma campanha registrada ainda."
          cols={[
            { h: "Campanha", cell: (c) => <span className="font-medium text-white">{c.name}</span> },
            { h: "Tenant", cell: (c) => <span className="text-gray-500">{c.tenant_id}</span> },
            { h: "Canal", cell: (c) => c.channel ?? "—" },
            { h: "Source", cell: (c) => c.source ?? "—" },
            { h: "Oferta", cell: (c) => <span className="truncate block max-w-[160px]">{c.oferta ?? "—"}</span> },
            { h: "Leads", cell: (c) => String(c.leads_gerados) },
            { h: "Premium", cell: (c) => <span className="text-emerald-400 font-semibold">{c.leads_premium}</span> },
            { h: "Baixo fit", cell: (c) => <span className="text-red-400">{c.leads_baixo_fit}</span> },
            {
              h: "Status", cell: (c) => (
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.status === "active" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-gray-400"}`}>
                  {c.status}
                </span>
              ),
            },
            { h: "Criada", cell: (c) => fmtDate(c.created_at) },
          ]}
        />
      </SectionCard>
    </div>
  );
}

// ── Tab: Leads ────────────────────────────────────────────────────────────────

function TabLeads({ data }: { data: CockpitData }) {
  const [filter, setFilter] = useState<"todos" | "hic" | "premium" | "baixo_fit">("todos");

  const filtered = data.leads.filter((l) => {
    if (filter === "hic") return l.human_in_control;
    if (filter === "premium") return l.classificacao === "fit_premium_pro";
    if (filter === "baixo_fit") return l.classificacao === "baixo_fit";
    return true;
  });

  const hicCount = data.leads.filter((l) => l.human_in_control).length;
  const premiumCount = data.leads.filter((l) => l.classificacao === "fit_premium_pro").length;
  const baixoCount = data.leads.filter((l) => l.classificacao === "baixo_fit").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Users} label="Total" value={String(data.leads.length)} />
        <KpiCard icon={CheckCircle2} label="Premium Pro" value={String(premiumCount)} tone="success" />
        <KpiCard icon={UserCheck} label="Com humano" value={String(hicCount)} tone={hicCount > 0 ? "warning" : "default"} />
        <KpiCard icon={XCircle} label="Baixo fit" value={String(baixoCount)} tone={baixoCount > 0 ? "danger" : "default"} />
      </div>

      <SectionCard title="Lista de leads" icon={Inbox}>
        <div className="flex items-center gap-1 mb-4 bg-white/[0.05] rounded-lg p-1 w-fit flex-wrap">
          {([
            { id: "todos", label: `Todos (${data.leads.length})` },
            { id: "hic", label: `Handoff (${hicCount})` },
            { id: "premium", label: `Premium (${premiumCount})` },
            { id: "baixo_fit", label: `Baixo fit (${baixoCount})` },
          ] as const).map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === f.id ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"}`}>
              {f.label}
            </button>
          ))}
        </div>

        <MiniTable
          rows={filtered}
          empty="Nenhum lead neste filtro."
          cols={[
            { h: "Nome", cell: (l) => l.lead_name ?? "—" },
            { h: "WhatsApp", cell: (l) => l.phone },
            { h: "Tenant", cell: (l) => <span className="text-gray-500">{l.tenant_id}</span> },
            {
              h: "Classificação",
              cell: (l) => <ClfBadge clf={l.classificacao} />,
            },
            {
              h: "Modo",
              cell: (l) => l.human_in_control
                ? <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">Humano{l.human_agent_name ? ` (${l.human_agent_name})` : ""}</span>
                : <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">Joana IA</span>,
            },
            { h: "Reeducação", cell: (l) => l.passou_por_reeducacao ? <span className="text-amber-400 text-[10px]">✓ sim</span> : <span className="text-gray-600 text-[10px]">não</span> },
            { h: "Segmento", cell: (l) => l.segmento ?? "—" },
            { h: "Última ativ.", cell: (l) => fmtRelative(l.last_activity_at) },
          ]}
        />
      </SectionCard>
    </div>
  );
}

// ── Tab: Funis ────────────────────────────────────────────────────────────────

function TabFunis({ data }: { data: CockpitData }) {
  const byStage = new Map<string, FunilLead[]>();
  for (const l of data.funil) {
    const stage = l.stage_key ?? l.pipeline_key ?? "sem_pipeline";
    const arr = byStage.get(stage) ?? [];
    arr.push(l);
    byStage.set(stage, arr);
  }
  const stages = Array.from(byStage.entries()).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard icon={GitMerge} label="Total no funil" value={String(data.funil.length)} />
        <KpiCard icon={Activity} label="Etapas ativas" value={String(byStage.size)} />
        <KpiCard icon={PhoneCall} label="Agendados (stage)" value={String(data.funil.filter((l) => l.stage_key?.toLowerCase().includes("agend")).length)} tone="success" />
      </div>

      {stages.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-sm">Nenhum lead no funil comercial.</div>
      ) : (
        stages.map(([stage, leads]) => (
          <SectionCard key={stage} title={`${stage} — ${leads.length} leads`} icon={GitMerge}>
            <MiniTable
              rows={leads.slice(0, 10)}
              empty="Vazio"
              cols={[
                { h: "Nome", cell: (l) => l.lead_name ?? "—" },
                { h: "WhatsApp", cell: (l) => l.phone },
                { h: "Canal", cell: (l) => l.canal ?? "—" },
                { h: "Origem", cell: (l) => l.origem ?? "—" },
                { h: "Responsável", cell: (l) => l.responsavel_nome ?? "—" },
                { h: "Status", cell: (l) => l.status },
                { h: "Criado em", cell: (l) => fmtDate(l.created_at) },
              ]}
            />
            {leads.length > 10 && (
              <p className="text-[10px] text-gray-600 mt-2 text-right">+{leads.length - 10} mais não exibidos</p>
            )}
          </SectionCard>
        ))
      )}
    </div>
  );
}

// ── Tab: Agentes ──────────────────────────────────────────────────────────────

function TabAgentes({ data }: { data: CockpitData }) {
  const { agentes } = data.overview;
  const [, nav] = useLocation();

  return (
    <div className="space-y-6">
      <button
        onClick={() => nav("/hub/automacao-comercial?company_slug=r2pb")}
        className="w-full flex items-center gap-4 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-4 transition-colors group text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
          <MessageSquare className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Configurar WhatsApp / Z-API</p>
          <p className="text-xs text-gray-500 mt-0.5">Instâncias, credenciais e status da automação comercial</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 shrink-0" />
      </button>

      <SectionCard title="Agentes IA ativos" icon={Bot}>
        {agentes.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-8">Nenhum agente com leads registrados.</p>
        ) : (
          <div className="space-y-4">
            {agentes.map((a) => {
              const pct = a.total_leads > 0 ? Math.round((a.leads_em_ia / a.total_leads) * 100) : 0;
              const hicPct = a.total_leads > 0 ? Math.round((a.leads_bloqueados_hic / a.total_leads) * 100) : 0;
              return (
                <div key={a.tenant_id} className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-violet-400" />
                        <p className="text-sm font-bold text-white">{a.nome}</p>
                        <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-300 border-violet-500/30">
                          {a.tenant_id}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{a.funcao} via {a.canal}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${a.liberado ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                      {a.liberado ? "100% IA" : `${a.leads_bloqueados_hic} bloqueado(s)`}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="text-center">
                      <p className="text-xl font-bold text-white">{a.total_leads}</p>
                      <p className="text-[10px] text-gray-500">total leads</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-emerald-400">{a.leads_em_ia}</p>
                      <p className="text-[10px] text-gray-500">em IA ({pct}%)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-amber-400">{a.leads_bloqueados_hic}</p>
                      <p className="text-[10px] text-gray-500">c/ humano ({hicPct}%)</p>
                    </div>
                  </div>

                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full flex">
                      <div className="bg-emerald-500/60 h-full" style={{ width: `${pct}%` }} />
                      <div className="bg-amber-500/60 h-full" style={{ width: `${hicPct}%` }} />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-2">Última atividade: {fmtRelative(a.ultima_atividade)}</p>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ── Tab: Config IA ────────────────────────────────────────────────────────────

const CONFIG_FIELDS: { k: keyof AiConfig; label: string; placeholder: string; area?: boolean }[] = [
  { k: "brand_name",               label: "Nome da marca",             placeholder: "Quick Threads / R2PB" },
  { k: "posicionamento",           label: "Posicionamento",            placeholder: "Confecção premium para marcas em crescimento…", area: true },
  { k: "publico_alvo",             label: "Público-alvo",              placeholder: "Donos de marca, lojistas B2B…", area: true },
  { k: "segmentos",                label: "Segmentos atendidos",       placeholder: "streetwear, fitness, casual, formal…" },
  { k: "criterios_qualificacao",   label: "Critérios de qualificação", placeholder: "Volume mínimo, modelo de negócio…", area: true },
  { k: "perguntas_obrigatorias",   label: "Perguntas obrigatórias",    placeholder: "1. Qual o volume mensal? 2. Tem marca própria?", area: true },
  { k: "tom_voz",                  label: "Tom de voz da Joana",       placeholder: "Casual, direto, simpático, sem jargão técnico…", area: true },
  { k: "regras_handoff",           label: "Regras de handoff",         placeholder: "Quando o lead mencionar prazo urgente, transferir…", area: true },
  { k: "pode_prometer",            label: "Pode prometer",             placeholder: "Amostras, protótipos, prazos padrão…", area: true },
  { k: "nao_pode_prometer",        label: "Não pode prometer",         placeholder: "Preços, descontos, exclusividade…", area: true },
  { k: "msg_baixo_fit",            label: "Mensagem: Baixo Fit",       placeholder: "Texto que a Joana envia para baixo fit…", area: true },
  { k: "msg_encaminhamento",       label: "Mensagem: Encaminhamento",  placeholder: "Texto para encaminhar ao suporte…", area: true },
  { k: "msg_reposicionamento_preco", label: "Mensagem: Preço",         placeholder: "Resposta quando o lead pergunta preço…", area: true },
];

function TabConfigIA() {
  const qc = useQueryClient();
  const TENANT = "r2pb";

  const { data, isLoading, isError } = useQuery<{ ok: boolean; config: AiConfig | null }>({
    queryKey: ["growth-ai-config", TENANT],
    queryFn: () => apiFetch(`/marketing/growth/ai-config?tenant=${TENANT}`),
  });

  const [form, setForm] = useState<Partial<AiConfig> | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const configData = data?.config ?? null;

  const currentForm = form ?? (configData ? { ...configData } : { tenant_id: TENANT });

  const handleSave = useCallback(async () => {
    setSaving(true); setMsg(null);
    try {
      await apiFetch("/marketing/growth/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: TENANT, ...currentForm }),
      });
      setMsg("Configuração salva com sucesso!");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["growth-ai-config", TENANT] });
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [currentForm, qc]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState msg="Erro ao carregar configuração da IA." />;

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`text-xs px-4 py-2 rounded-lg ${msg.startsWith("Erro") ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>
          {msg}
        </div>
      )}

      <SectionCard title="Configuração da Joana IA — R2PB" icon={Settings}>
        <p className="text-xs text-gray-500 mb-5">
          Esses campos configuram o comportamento da Joana: posicionamento, critérios de qualificação, mensagens padrão e regras de handoff.
          Salvar aqui atualiza a base — para recarregar no runtime da Joana, faça um deploy ou reinicie o agente.
        </p>

        <div className="space-y-4">
          {CONFIG_FIELDS.map(({ k, label, placeholder, area }) => (
            <div key={k}>
              <label className="text-[11px] text-gray-400 block mb-1 font-medium">{label}</label>
              {area ? (
                <textarea
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500/50 resize-y"
                  placeholder={placeholder}
                  value={(currentForm as Record<string, string | null>)[k] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...(p ?? currentForm), [k]: e.target.value }))}
                />
              ) : (
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500/50"
                  placeholder={placeholder}
                  value={(currentForm as Record<string, string | null>)[k] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...(p ?? currentForm), [k]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm px-6 py-2.5 rounded-xl disabled:opacity-50 font-medium"
          >
            <Save className="w-4 h-4" /> {saving ? "Salvando…" : "Salvar configuração"}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

// ── Tab: Insights ─────────────────────────────────────────────────────────────

function TabInsights({ data }: { data: CockpitData }) {
  const daily = data.insights.classificacoes_por_dia;

  // Agrupa dias em séries por classificação
  const allDays = [...new Set(daily.map((d) => d.day))].sort();
  const allClf = [...new Set(daily.map((d) => d.classificacao))];

  const chartData = allDays.map((day) => {
    const row: Record<string, unknown> = { day: day.slice(5) };
    for (const clf of allClf) {
      row[clf] = daily.find((d) => d.day === day && d.classificacao === clf)?.count ?? 0;
    }
    return row;
  });

  // Distribuição total por classificação (últimos 30d)
  const totalByCLF = new Map<string, number>();
  for (const d of daily) {
    totalByCLF.set(d.classificacao, (totalByCLF.get(d.classificacao) ?? 0) + d.count);
  }
  const totalLeads30d = Array.from(totalByCLF.values()).reduce((a, b) => a + b, 0);

  // Campanhas por qualidade de lead (premium rate)
  const topCamps = [...data.campanhas]
    .filter((c) => c.leads_gerados > 0)
    .sort((a, b) => b.leads_premium - a.leads_premium)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={TrendingUp} label="Leads últimos 30d" value={String(totalLeads30d)} />
        <KpiCard icon={CheckCircle2} label="Premium (30d)" value={String(totalByCLF.get("fit_premium_pro") ?? 0)}
          tone="success"
          sub={totalLeads30d > 0 ? `${Math.round(((totalByCLF.get("fit_premium_pro") ?? 0) / totalLeads30d) * 100)}% de conversão` : undefined} />
      </div>

      {chartData.length > 0 && (
        <SectionCard title="Classificações por dia (30d)" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
              <Tooltip
                contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }}
                labelStyle={{ color: "#9ca3af" }}
              />
              {allClf.map((clf) => (
                <Bar key={clf} dataKey={clf} stackId="a" fill={CLF_CHART_COLORS[clf] ?? "#6b7280"}
                  name={CLF_META[clf]?.label ?? clf} />
              ))}
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-3">
            {allClf.map((clf) => (
              <div key={clf} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: CLF_CHART_COLORS[clf] ?? "#6b7280" }} />
                <span className="text-[10px] text-gray-400">{CLF_META[clf]?.label ?? clf}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {topCamps.length > 0 && (
        <SectionCard title="Campanhas por qualidade de lead" icon={Megaphone}>
          <MiniTable
            rows={topCamps}
            empty=""
            cols={[
              { h: "Campanha", cell: (c) => <span className="font-medium text-white">{c.name}</span> },
              { h: "Source", cell: (c) => c.source ?? "—" },
              { h: "Leads", cell: (c) => String(c.leads_gerados) },
              { h: "Premium", cell: (c) => <span className="text-emerald-400 font-bold">{c.leads_premium}</span> },
              { h: "Baixo fit", cell: (c) => <span className="text-red-400">{c.leads_baixo_fit}</span> },
              {
                h: "Taxa premium",
                cell: (c) => {
                  const pct = c.leads_gerados > 0 ? Math.round((c.leads_premium / c.leads_gerados) * 100) : 0;
                  return <span className={pct > 30 ? "text-emerald-400 font-bold" : "text-gray-400"}>{pct}%</span>;
                },
              },
            ]}
          />
        </SectionCard>
      )}

      {chartData.length === 0 && topCamps.length === 0 && (
        <div className="text-center py-16 text-gray-500 text-sm">
          Sem dados suficientes para gerar insights ainda.<br />
          <span className="text-xs">Os insights aparecem após os primeiros leads serem classificados pela Joana.</span>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "visao-geral",  label: "Visão Geral",      icon: Eye },
  { id: "marketing",    label: "Marketing",         icon: Megaphone },
  { id: "leads",        label: "Leads",             icon: Users },
  { id: "funis",        label: "Funis",             icon: GitMerge },
  { id: "agentes",      label: "Agentes",           icon: Bot },
  { id: "config-ia",    label: "Config. IA",        icon: Settings },
  { id: "insights",     label: "Insights",          icon: BarChart3 },
];

export default function GrowthHomePage() {
  const [, nav] = useLocation();
  const [tab, setTab] = useState<TabId>("visao-geral");
  const qc = useQueryClient();

  const { data: cockpit, isLoading, isError, error, refetch } = useQuery<CockpitData>({
    queryKey: ["growth-cockpit"],
    queryFn: () => apiFetch("/marketing/growth/cockpit?tenant=r2pb"),
    refetchInterval: 30_000,
  });

  const refresh = useCallback(() => {
    void refetch();
    qc.invalidateQueries({ queryKey: ["growth-ai-config"] });
  }, [refetch, qc]);

  const health = cockpit
    ? cockpit.overview.handoffs_abertos > 0
      ? { label: `${cockpit.overview.handoffs_abertos} handoff(s) aberto(s) — verificar agentes`, dot: "bg-amber-400", tone: "text-amber-400" }
      : { label: "Operação estável — Joana operando normalmente", dot: "bg-emerald-400", tone: "text-emerald-400" }
    : { label: "Carregando…", dot: "bg-gray-600", tone: "text-gray-500" };

  return (
    <div className="min-h-screen bg-[#0b0b10] text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start gap-3 mb-8">
          <button onClick={() => nav("/hub")} className="text-gray-500 hover:text-white transition-colors mt-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Growth R2PB</h1>
              <Badge variant="outline" className="bg-violet-500/10 text-violet-300 border-violet-500/30">Marketing + Vendas + IA</Badge>
            </div>
            <p className="text-sm text-gray-400 mt-1.5 max-w-2xl">
              Cockpit operacional: campanhas, leads qualificados pela Joana, funil comercial e configuração de IA.
            </p>
            <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${health.dot} animate-pulse`} />
                <span className={`text-xs font-medium ${health.tone}`}>{health.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={refresh} className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-400 transition-colors">
                  <RefreshCw className="w-3 h-3" /> Atualizar
                </button>
                <button onClick={() => nav("/hub/marketing")} className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-400 transition-colors">
                  <span>Carteira SaaS</span><ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/[0.04] rounded-xl p-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                tab === id ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20" : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
              }`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "config-ia" ? (
          <TabConfigIA />
        ) : isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState msg={`Erro ao carregar cockpit: ${(error as Error)?.message ?? "desconhecido"}`} />
        ) : cockpit ? (
          <>
            {tab === "visao-geral" && <TabVisaoGeral data={cockpit} />}
            {tab === "marketing"   && <TabMarketing data={cockpit} onRefresh={refresh} />}
            {tab === "leads"       && <TabLeads data={cockpit} />}
            {tab === "funis"       && <TabFunis data={cockpit} />}
            {tab === "agentes"     && <TabAgentes data={cockpit} />}
            {tab === "insights"    && <TabInsights data={cockpit} />}
          </>
        ) : null}

      </div>
    </div>
  );
}
