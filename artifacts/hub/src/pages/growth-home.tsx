import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Eye, Megaphone, Users, GitMerge, Bot, Settings, BarChart3,
  ArrowLeft, Sparkles, ChevronRight, AlertCircle, RefreshCw,
  CheckCircle2, XCircle, Clock, Zap, MessageSquare, Activity,
  TrendingUp, UserCheck, UserX, Inbox, PhoneCall, Send, Hash,
  Plus, Pencil, Save, X, ChevronDown,
  Wand2, Loader2, ImageIcon, Film, ChevronLeft, LayoutGrid, RefreshCcw,
  Building2, Palette, PlusCircle, Upload, Type,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type TabId = "visao-geral" | "marketing" | "leads" | "funis" | "agentes" | "config-ia" | "insights";

interface Tenant { id: string; slug: string; name?: string; nome?: string; }

interface BrandData {
  company_slug?: string;
  nome_marca?: string | null;
  segmento?: string | null;
  tom_de_voz?: string | null;
  estilo_visual?: string | null;
  cor_primaria?: string | null;
  logo_url?: string | null;
  promessa?: string | null;
  proposito?: string | null;
  produto_principal?: string | null;
  objetivo_atual?: string | null;
  referencias_esteticas?: string | null;
}

interface CockpitLead {
  tenant_id: string; phone: string; lead_name: string | null;
  classificacao: string | null; human_in_control: boolean;
  human_agent_name: string | null; last_activity_at: string;
  passou_por_reeducacao: boolean; status: string;
  segmento: string | null; resumo: string | null;
  current_agent: string | null;
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
  nicho: string | null; intencao_criativa: string | null; estagio_funil: string | null;
  creative_mode: string | null;
  created_at: string; leads_gerados: number; leads_premium: number; leads_baixo_fit: number;
}

interface Agente {
  tenant_id: string; nome: string; canal: string; funcao: string;
  total_leads: number; leads_em_ia: number; leads_bloqueados_hic: number;
  liberado: boolean; ultima_atividade: string | null;
}

interface Classificacao { classificacao: string; count: number; }

interface GrowthAsset {
  id: string; tenantId: string; campaignId: string | null;
  assetType: string; provider: string; status: string;
  outputUrl: string | null;
  promptInput: {
    prompt?: string; script?: string;
    segment?: string; creative_axis?: string; creative_type?: string; context_note?: string;
    creative_mode?: string;
    visual_register?: string;
    pipeline?: string;
    enriched_prompt?: string; original_prompt?: string;
    direction_applied?: string[]; negative_terms?: string[];
    [k: string]: unknown;
  } | null;
  title: string | null; createdAt: string;
  caption: string | null;
  headline: string | null;
  cta: string | null;
  compositionApplied: boolean;
  sourcePipeline: string;
  publishDestination: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
}

interface CampaignSlot {
  id: string; tenantId: string; campaignId: string;
  slotType: "feed" | "story" | "reel";
  slotIndex: number; plannedDate: string | null;
  creativeAxis: string | null; segment: string | null; objective: string | null;
  creative_archetype: string | null;
  isExtra: boolean;
  status: string; // pending_generation | generating | generated | approved | scheduled | published | rejected
  regenerationOf: string | null; assetId: string | null;
  createdAt: string; updatedAt: string;
  asset?: GrowthAsset | null;
  // Hipótese criativa
  hypothesis_angle?: string | null;
  target_context?: string | null;
  pain_point?: string | null;
  promise?: string | null;
  creative_style?: string | null;
  hook_type?: string | null;
  cta_type?: string | null;
  usage_type?: string | null;
}

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
  em_qualificacao:    { label: "Em qualificação",  color: "text-slate-700",     bg: "bg-white/10" },
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
    default: "text-slate-700", success: "text-emerald-400",
    warning: "text-amber-400", danger: "text-red-400",
  };
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
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
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function MiniTable<T>({ rows, cols, empty, onRowClick, selectedId }: {
  rows: T[]; empty: string;
  cols: { h: string; cell: (r: T) => React.ReactNode; w?: string }[];
  onRowClick?: (r: T) => void;
  selectedId?: string;
}) {
  if (rows.length === 0) return <p className="text-xs text-gray-500 text-center py-6">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200">
            {cols.map((c) => (
              <th key={c.h} className={`text-left py-2 pr-4 text-gray-600 font-medium ${c.w ?? ""}`}>{c.h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const rid = (r as any).id;
            const isSelected = selectedId && rid === selectedId;
            return (
              <tr key={i}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={`border-b border-slate-200 transition-colors ${onRowClick ? "cursor-pointer" : ""} ${
                  isSelected ? "bg-violet-100" : onRowClick ? "hover:bg-violet-50" : "hover:bg-slate-50"
                }`}>
                {cols.map((c) => (
                  <td key={c.h} className="py-2 pr-4 text-gray-700">{c.cell(r)}</td>
                ))}
              </tr>
            );
          })}
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
                  <p className="text-sm font-semibold text-slate-900">{a.nome} <span className="text-gray-500 font-normal text-xs">— {a.tenant_id}</span></p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{a.funcao} · {a.canal}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${a.liberado ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                  {a.liberado ? "operacional" : `${a.leads_bloqueados_hic} bloqueado(s)`}
                </span>
              </div>
              <div className="flex gap-4 mt-3">
                <span className="text-[11px] text-gray-500"><span className="text-slate-900 font-bold">{a.total_leads}</span> leads total</span>
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

// ── Marketing: sub-componentes ────────────────────────────────────────────────

const MKT_STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  awaiting_approval: { label: "Em revisão",      color: "#f59e0b", bg: "#1c1407", border: "#92400e" },
  approved:          { label: "Aprovado",         color: "#22c55e", bg: "#052e16", border: "#15803d" },
  rejected:          { label: "Descartado",       color: "#ef4444", bg: "#1c0606", border: "#991b1b" },
  generating:        { label: "Gerando",          color: "#60a5fa", bg: "#0c1a2e", border: "#1e3a5f" },
  requested:         { label: "Na fila",          color: "#64748b", bg: "#1a2538", border: "#e2e8f0" },
  scheduled:         { label: "⏰ Ag. interno",   color: "#a78bfa", bg: "#1e1b4b", border: "#4338ca" },
  published:         { label: "✅ Instagram",       color: "#34d399", bg: "#022c22", border: "#065f46" },
  publish_failed:    { label: "Falha",            color: "#f87171", bg: "#1c0606", border: "#991b1b" },
};

function MktStatusBadge({ status }: { status: string }) {
  const cfg = MKT_STATUS[status] ?? MKT_STATUS.requested;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function AssetThumb({ asset, onClick }: { asset: GrowthAsset; onClick: () => void }) {
  const isImg = asset.assetType === "image";
  const src   = isImg && asset.outputUrl ? `/api/storage${asset.outputUrl}` : null;
  return (
    <button onClick={onClick} style={{ background: "#ffffff", border: "1px solid #2d3d52", borderRadius: 10, overflow: "hidden", cursor: "pointer", textAlign: "left", width: "100%", transition: "border-color .15s" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#cbd5e1")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#e2e8f0")}>
      <div style={{ height: 150, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> :
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "#1e293b" }}>
            {isImg ? <ImageIcon style={{ width: 28, height: 28 }} /> : <Film style={{ width: 28, height: 28 }} />}
            <span style={{ fontSize: 10, color: "#cbd5e1" }}>{isImg ? "Gerando…" : "Renderizando"}</span>
          </div>}
        <div style={{ position: "absolute", top: 6, right: 6 }}><MktStatusBadge status={asset.status} /></div>
      </div>
      <div style={{ padding: "8px 10px" }}>
        <p style={{ fontSize: 11, color: "#cbd5e1", margin: "0 0 3px", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
          {asset.title ?? asset.promptInput?.prompt ?? "Sem título"}
        </p>
        {(asset.promptInput?.creative_mode || asset.promptInput?.creative_axis || asset.promptInput?.segment) && (
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 3 }}>
            {asset.promptInput?.creative_mode && (
              <span style={{ fontSize: 8, background: "#ede9fe", color: "#4c1d95", borderRadius: 3, padding: "1px 4px", fontWeight: 700 }}>
                🎨 {asset.promptInput.creative_mode}
              </span>
            )}
            {!asset.promptInput?.creative_mode && asset.promptInput?.creative_axis && (
              <span style={{ fontSize: 8, background: asset.promptInput.creative_axis === "autoridade_fabrica" ? "#1c3352" : "#1e1b4b", color: asset.promptInput.creative_axis === "autoridade_fabrica" ? "#93c5fd" : "#a5b4fc", borderRadius: 3, padding: "1px 4px", fontWeight: 700 }}>
                {asset.promptInput.creative_axis === "autoridade_fabrica" ? "🏭 fábrica" : "✦ lifestyle"}
              </span>
            )}
            {asset.promptInput?.segment && (
              <span style={{ fontSize: 8, background: "#ffffff", color: "#475569", borderRadius: 3, padding: "1px 4px", border: "1px solid #2d3d52" }}>
                {asset.promptInput.segment}
              </span>
            )}
          </div>
        )}
        {asset.headline ? (
          <p style={{ fontSize: 10, color: "#1e293b", margin: "0 0 3px", lineHeight: 1.3, fontWeight: 700, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" as const }}>
            {asset.headline}
          </p>
        ) : asset.caption ? (
          <p style={{ fontSize: 10, color: "#475569", margin: "0 0 3px", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
            {asset.caption}
          </p>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: "#cbd5e1" }}>{new Date(asset.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
          {!asset.compositionApplied && asset.sourcePipeline === "legacy" && (
            <span style={{ fontSize: 9, background: "#1c1007", color: "#d97706", borderRadius: 4, padding: "1px 5px", fontWeight: 700 }}>LEGADO</span>
          )}
        </div>
      </div>
    </button>
  );
}

const DEST_LABELS: Record<string, string> = { feed: "📸 Feed", story: "📱 Stories", reel: "🎬 Reel" };

function AssetDetailModal({ asset, onClose, onApprove, onDiscard, onPublish, loading }: {
  asset: GrowthAsset; onClose: () => void;
  onApprove: (id: string) => void; onDiscard: (id: string) => void;
  onPublish: (id: string, dest: string, mode: string, scheduledAt?: string, captionOverride?: string) => void;
  loading: boolean;
}) {
  const isImg = asset.assetType === "image";
  const src   = isImg && asset.outputUrl ? `/api/storage${asset.outputUrl}` : null;
  const canAct    = asset.status === "awaiting_approval";
  const canPublish = ["approved", "scheduled"].includes(asset.status);

  const [schedDate, setSchedDate] = useState("");
  const [schedMode, setSchedMode] = useState<"immediate" | "scheduled">("immediate");

  // Publish confirm modal state
  const [publishConfirm, setPublishConfirm] = useState<{ dest: string } | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#ffffff", border: "1px solid #2d3d52", borderRadius: 16, width: "100%", maxWidth: 680, maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #2d3d52", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 5 }}>
              <MktStatusBadge status={asset.status} />
              {asset.promptInput?.creative_axis && (
                <span style={{ fontSize: 9, background: asset.promptInput.creative_axis === "autoridade_fabrica" ? "#1c3352" : "#1e1b4b", color: asset.promptInput.creative_axis === "autoridade_fabrica" ? "#93c5fd" : "#a5b4fc", borderRadius: 3, padding: "2px 7px", fontWeight: 700 }}>
                  {asset.promptInput.creative_axis === "autoridade_fabrica" ? "🏭 Autoridade — Fábrica" : "✦ Lifestyle Nicho"}
                </span>
              )}
              {asset.promptInput?.segment && (
                <span style={{ fontSize: 9, background: "#ffffff", color: "#64748b", borderRadius: 3, padding: "2px 7px", border: "1px solid #2d3d52", fontWeight: 600 }}>
                  {asset.promptInput.segment}
                </span>
              )}
            </div>
            <span style={{ fontSize: 13, color: "#1e293b", fontWeight: 700 }}>{asset.title ?? "Asset sem título"}</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", flexShrink: 0, marginTop: 2 }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          {isImg && (
            <div style={{ borderRadius: 10, overflow: "hidden", background: "#000", border: "1px solid #2d3d52" }}>
              {src ? <img src={src} alt="Asset" style={{ width: "100%", display: "block", maxHeight: 380, objectFit: "contain" }} /> :
                <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#cbd5e1", gap: 8 }}>
                  <ImageIcon style={{ width: 28, height: 28 }} /><span style={{ fontSize: 12 }}>Gerando imagem…</span>
                </div>}
            </div>
          )}
          {!isImg && asset.outputUrl && (
            <video controls style={{ width: "100%", display: "block", background: "#000", maxHeight: 340, borderRadius: 10 }} src={asset.outputUrl} />
          )}
          {asset.headline && (
            <div style={{ background: "#f8fafc", border: "1px solid #2d3d52", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>💡 Headline</div>
              <p style={{ fontSize: 17, color: "#0f172a", margin: 0, fontWeight: 800, lineHeight: 1.3 }}>{asset.headline}</p>
            </div>
          )}
          {(asset.caption || asset.cta) && (
            <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>📝 Legenda do Post</div>
              {asset.caption && <p style={{ fontSize: 13, color: "#cbd5e1", margin: "0 0 8px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{asset.caption}</p>}
              {asset.cta && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>CTA:</span>
                  <span style={{ fontSize: 12, color: "#60a5fa", fontWeight: 600 }}>{asset.cta}</span>
                </div>
              )}
            </div>
          )}
          {!asset.compositionApplied && asset.sourcePipeline === "legacy" && (
            <div style={{ background: "#1c1007", border: "1px solid #78350f", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#d97706" }}>ℹ️ Criativo legado — branding não aplicado</span>
            </div>
          )}
          {/* Auditoria completa do criativo */}
          <details style={{ background: "#f8fafc", border: "1px solid #2d3d52", borderRadius: 8, padding: "10px 14px" }}>
            <summary style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".07em", cursor: "pointer" }}>🔍 Auditoria do criativo</summary>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {asset.promptInput?.creative_mode && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 3 }}>Modo criativo</div>
                  <span style={{ fontSize: 11, background: "#ede9fe", color: "#4c1d95", borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>{asset.promptInput.creative_mode}</span>
                </div>
              )}
              {asset.promptInput?.creative_type && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 3 }}>Tipo criativo</div>
                  <span style={{ fontSize: 11, color: "#475569" }}>{asset.promptInput.creative_type}</span>
                </div>
              )}
              {asset.promptInput?.context_note && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 3 }}>Contexto da campanha</div>
                  <p style={{ fontSize: 11, color: "#475569", margin: 0, lineHeight: 1.5 }}>{asset.promptInput.context_note}</p>
                </div>
              )}
              {asset.promptInput?.original_prompt && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 3 }}>Prompt original (GPT → brief)</div>
                  <p style={{ fontSize: 11, color: "#475569", margin: 0, lineHeight: 1.5, fontFamily: "monospace" }}>{asset.promptInput.original_prompt}</p>
                </div>
              )}
              {(asset.promptInput?.enriched_prompt ?? asset.promptInput?.prompt ?? asset.promptInput?.script) && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 3 }}>Prompt final (enviado ao provider)</div>
                  <p style={{ fontSize: 11, color: "#334155", margin: 0, lineHeight: 1.6, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                    {asset.promptInput?.enriched_prompt ?? asset.promptInput?.prompt ?? asset.promptInput?.script}
                  </p>
                </div>
              )}
              {Array.isArray(asset.promptInput?.direction_applied) && asset.promptInput!.direction_applied!.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 3 }}>Direções aplicadas</div>
                  <ul style={{ margin: 0, padding: "0 0 0 14px", listStyle: "disc" }}>
                    {(asset.promptInput!.direction_applied as string[]).map((d, i) => (
                      <li key={i} style={{ fontSize: 10, color: "#64748b", lineHeight: 1.6 }}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(asset.promptInput?.negative_terms) && asset.promptInput!.negative_terms!.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 3 }}>Guardrails negativos aplicados</div>
                  <p style={{ fontSize: 10, color: "#ef4444", margin: 0, lineHeight: 1.6, opacity: 0.8 }}>
                    {(asset.promptInput!.negative_terms as string[]).slice(0, 8).join(" · ")}
                    {(asset.promptInput!.negative_terms as string[]).length > 8 ? ` · +${(asset.promptInput!.negative_terms as string[]).length - 8} mais` : ""}
                  </p>
                </div>
              )}
            </div>
          </details>
          {asset.status === "approved" && (
            <div style={{ background: "#052e16", border: "1px solid #15803d", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 style={{ width: 14, height: 14, color: "#22c55e" }} />
              <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>Aprovado — pronto para publicar</span>
            </div>
          )}
          {asset.status === "scheduled" && (
            <div style={{ background: "#1e1b4b", border: "1px solid #4338ca", borderRadius: 8, padding: "10px 14px" }}>
              <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>⏰ Agendado — {DEST_LABELS[asset.publishDestination ?? ""] ?? asset.publishDestination}{asset.scheduledAt ? ` · ${new Date(asset.scheduledAt).toLocaleString("pt-BR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}` : ""}</span>
            </div>
          )}
          {asset.status === "published" && (
            <div style={{ background: "#022c22", border: "1px solid #065f46", borderRadius: 8, padding: "10px 14px" }}>
              <span style={{ fontSize: 12, color: "#34d399", fontWeight: 600 }}>✅ Publicado no Instagram — {DEST_LABELS[asset.publishDestination ?? ""] ?? asset.publishDestination}{asset.publishedAt ? ` · ${new Date(asset.publishedAt).toLocaleString("pt-BR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}` : ""}</span>
              <p style={{ fontSize: 10, color: "#065f46", margin: "4px 0 0" }}>Confirmado via API Meta Graph → Instagram R2PB.</p>
            </div>
          )}
          {canPublish && (
            <div style={{ background: "#f8fafc", border: "1px solid #2d3d52", borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10 }}>📤 Publicar / Agendar</p>
              {/* Destino */}
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                {(["feed", "story", "reel"] as const).map(dest => (
                  <button key={dest}
                    onClick={() => { setCaptionDraft(asset.caption ?? ""); setPublishConfirm({ dest }); }}
                    disabled={loading}
                    style={{ flex: 1, minWidth: 80, background: loading ? "#e2e8f0" : asset.publishDestination === dest ? "#1d4ed8" : "#1a2538", border: `1px solid ${asset.publishDestination === dest ? "#2563eb" : "#e2e8f0"}`, borderRadius: 8, color: asset.publishDestination === dest ? "#fff" : "#94a3b8", fontSize: 11, fontWeight: 700, padding: "8px 6px", cursor: loading ? "default" : "pointer", transition: "all .15s", textAlign: "center" }}>
                    {DEST_LABELS[dest]}
                  </button>
                ))}
              </div>
              {/* Modo */}
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {(["immediate", "scheduled"] as const).map(m => (
                  <button key={m} onClick={() => setSchedMode(m)}
                    style={{ flex: 1, background: schedMode === m ? "#312e81" : "transparent", border: `1px solid ${schedMode === m ? "#4338ca" : "#e2e8f0"}`, borderRadius: 6, color: schedMode === m ? "#a78bfa" : "#7b8fa8", fontSize: 10, fontWeight: 600, padding: "5px 8px", cursor: "pointer" }}>
                    {m === "immediate" ? "⚡ Agora" : "📅 Agendar"}
                  </button>
                ))}
              </div>
              {schedMode === "scheduled" && (
                <input type="datetime-local" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                  style={{ width: "100%", background: "#ffffff", border: "1px solid #445570", borderRadius: 6, color: "#1e293b", fontSize: 11, padding: "6px 10px", outline: "none", boxSizing: "border-box" }} />
              )}
              <p style={{ fontSize: 10, color: "#cbd5e1", marginTop: 6 }}>R2PB: publica automaticamente no Instagram via n8n. Mirage: registra na fila interna.</p>
            </div>
          )}

          {/* ── Publish Confirm Modal ────────────────────────────── */}
          {publishConfirm && (
            <div onClick={() => setPublishConfirm(null)} style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              <div onClick={e => e.stopPropagation()} style={{ background: "#0f172a", border: "1px solid #2d3d52", borderRadius: 16, width: "100%", maxWidth: 540, maxHeight: "85vh", overflow: "auto", display: "flex", flexDirection: "column" }}>
                {/* Header */}
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #2d3d52", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#f1f5f9" }}>📤 Confirmar publicação</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>{DEST_LABELS[publishConfirm.dest] ?? publishConfirm.dest} · {schedMode === "immediate" ? "⚡ Agora" : `📅 ${schedDate ? new Date(schedDate).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Agendar"}`}</p>
                  </div>
                  <button onClick={() => setPublishConfirm(null)} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}>
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>
                {/* Caption editor */}
                <div style={{ padding: "16px 18px", flex: 1 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>📝 Legenda — revise e edite antes de publicar</p>
                  <textarea
                    value={captionDraft}
                    onChange={e => setCaptionDraft(e.target.value)}
                    rows={10}
                    style={{ width: "100%", background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 8, color: "#cbd5e1", fontSize: 13, lineHeight: 1.7, padding: "10px 12px", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                    placeholder="Legenda vazia — será publicado sem legenda."
                  />
                  {asset.cta && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                      <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>CTA:</span>
                      <span style={{ fontSize: 12, color: "#60a5fa", fontWeight: 600 }}>{asset.cta}</span>
                    </div>
                  )}
                  <p style={{ fontSize: 10, color: "#475569", marginTop: 8 }}>Alterações aqui valem só para esta publicação — o texto salvo no asset não é alterado.</p>
                </div>
                {/* Footer actions */}
                <div style={{ padding: "12px 18px", borderTop: "1px solid #2d3d52", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setPublishConfirm(null)} disabled={loading}
                    style={{ background: "transparent", border: "1px solid #445570", borderRadius: 8, color: "#94a3b8", fontSize: 12, padding: "8px 16px", cursor: loading ? "default" : "pointer", fontWeight: 600 }}>
                    Cancelar
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => {
                      onPublish(asset.id, publishConfirm.dest, schedMode, schedMode === "scheduled" && schedDate ? schedDate : undefined, captionDraft.trim() !== (asset.caption ?? "").trim() ? captionDraft : undefined);
                      setPublishConfirm(null);
                    }}
                    style={{ background: loading ? "#1e3a5f" : "#1d4ed8", border: "1px solid #2563eb", borderRadius: 8, color: "#ffffff", fontSize: 12, padding: "8px 18px", cursor: loading ? "default" : "pointer", fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
                    {loading ? "Publicando…" : schedMode === "immediate" ? "⚡ Publicar agora" : "📅 Agendar"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {canAct && (
          <div style={{ padding: "12px 18px", borderTop: "1px solid #2d3d52", display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => onDiscard(asset.id)} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "1px solid #445570", borderRadius: 8, color: "#475569", fontSize: 12, padding: "7px 14px", cursor: loading ? "default" : "pointer", fontWeight: 600 }}>
              <XCircle style={{ width: 12, height: 12 }} /> Descartar
            </button>
            {isImg && (
              <button onClick={() => onApprove(asset.id)} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 5, background: loading ? "#e2e8f0" : "#1d4ed8", border: "1px solid #2563eb", borderRadius: 8, color: "#ffffff", fontSize: 12, padding: "7px 14px", cursor: loading ? "default" : "pointer", fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
                <CheckCircle2 style={{ width: 12, height: 12 }} /> {loading ? "Aprovando…" : "Aprovar"}
              </button>
            )}
          </div>
        )}
        {/* Download sempre disponível quando há imagem */}
        {isImg && src && (
          <div style={{ padding: "8px 18px", borderTop: "1px solid #1a2538", display: "flex", gap: 6 }}>
            <a href={src} download target="_blank" rel="noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 5, background: "#ffffff", border: "1px solid #2d3d52", borderRadius: 8, color: "#475569", fontSize: 11, padding: "6px 12px", cursor: "pointer", fontWeight: 600, textDecoration: "none" }}>
              ⬇ Baixar arte
            </a>
            {asset.caption && (
              <button onClick={() => navigator.clipboard.writeText(asset.caption!)}
                style={{ display: "flex", alignItems: "center", gap: 5, background: "#ffffff", border: "1px solid #2d3d52", borderRadius: 8, color: "#475569", fontSize: 11, padding: "6px 12px", cursor: "pointer", fontWeight: 600 }}>
                📋 Copiar legenda
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── PromptIA Panel ────────────────────────────────────────────────────────────
interface PromptSettings {
  tenant_id: string;
  image_prompt_master?: string; video_prompt_master?: string; negative_prompt?: string;
  feed_prompt_modifier?: string; story_prompt_modifier?: string; reel_prompt_modifier?: string;
  authority_prompt_block?: string; process_prompt_block?: string;
  lifestyle_prompt_block?: string; product_prompt_block?: string;
  color_direction?: string; casting_direction?: string; scenario_direction?: string;
  // Texto na Imagem
  text_overlay_required?: boolean;
  image_headline_primary?: string; image_headline_variations?: string;
  image_text_style_instruction?: string;
  feed_text_overlay_instruction?: string; story_text_overlay_instruction?: string; reel_text_overlay_instruction?: string;
  // Chamada do Post / Legenda
  post_caption_cta_primary?: string; post_caption_cta_variations?: string;
  post_caption_tone?: string; post_caption_structure?: string;
  post_caption_instruction_master?: string;
  // Variação de legenda por formato
  feed_caption_modifier?: string; story_caption_modifier?: string; reel_caption_modifier?: string;
}

const PS_DEFAULTS: Omit<PromptSettings, "tenant_id"> = {
  image_prompt_master: "Criar campanha publicitária premium para a R2PB Confecções com foco em captação de marcas de streetwear premium que buscam produção private label com estrutura real de fábrica. Cada criativo deve transmitir autoridade, sofisticação, capacidade produtiva, confiança, domínio técnico e percepção de parceiro industrial premium. Os criativos devem mostrar que a R2PB desenvolve e produz coleção com padrão elevado, indo além de imagens bonitas. A campanha precisa comunicar estrutura, processo, segurança, qualidade e capacidade real de execução. É obrigatório variar fortemente os criativos entre si. Não repetir o mesmo modelo, o mesmo conjunto de moletom, o mesmo enquadramento, a mesma pose, a mesma composição visual ou a mesma peça dominante em todos os slots. A campanha deve parecer anúncio de captação premium, não lookbook genérico, não editorial monótono e não catálogo vazio.",
  negative_prompt: "Sem texto legível na imagem. Sem look book de modelo único. Sem moletom cinza liso sem cor. Evitar repetição de mesmo look, mesmo modelo, mesmo cenário. Sem estética de IA barata, sem plástico.",
  feed_prompt_modifier: "Criar feed com cara de anúncio premium e autoridade de fábrica. Cada peça deve ter proposta comercial clara, composição forte e foco em captação de marcas. Variar entre produto, bastidor, processo, estrutura e percepção de marca premium. Evitar feed puramente editorial.",
  story_prompt_modifier: "Criar stories verticais com linguagem nativa de anúncio, leitura imediata e proposta comercial clara. Variar entre autoridade, processo, produto e transformação da ideia em coleção. Não gerar apenas adaptação fraca do feed.",
  reel_prompt_modifier: "Criar conceito de reel premium com ritmo visual, prova de processo, percepção de fábrica organizada e linguagem de anúncio para captação. A capa do reel deve comunicar autoridade e intenção comercial.",
  authority_prompt_block: "Transmitir autoridade de fábrica premium, domínio técnico, organização operacional, experiência em private label, confiança para marcas em crescimento e capacidade real de executar coleção com consistência.",
  process_prompt_block: "Mostrar mesa de desenvolvimento, modelagem, corte, costura, revisão, acabamento, detalhes de construção, matéria-prima, manipulação técnica do produto, organização fabril e percepção de produção premium real.",
  lifestyle_prompt_block: "Usar lifestyle apenas como apoio estratégico, nunca como base repetitiva da campanha. Quando houver modelo, variar styling, atitude, ambiente, composição e energia visual. O lifestyle deve reforçar valor de marca e não substituir a autoridade de fábrica.",
  product_prompt_block: "Variar entre camisetas premium, moletons, calças, conjuntos, oversized, básicos sofisticados, detalhes de acabamento, costura, caimento, tecido e peças em desenvolvimento. Não concentrar a campanha inteira em um único conjunto de moletom.",
  color_direction: "Evitar campanha apagada, monocromática e sem vida. Trabalhar contraste, profundidade e variedade controlada de cores premium. Usar neutros com inteligência, mas nunca deixar todos os criativos iguais ou visualmente mortos.",
  casting_direction: "Variar perfis, presença humana, poses, enquadramentos e linguagem corporal. Não repetir um único modelo dominante em todos os criativos. Alternar entre modelo, mãos em processo, close de produto e composições sem rosto quando fizer sentido.",
  scenario_direction: "Variar entre fábrica premium organizada, mesa de criação, araras, bastidores de desenvolvimento, close de tecido, costura, acabamento, showroom enxuto e fundos limpos premium. Evitar cenário único repetido em toda a campanha.",
  // Texto na Imagem — R2PB
  text_overlay_required: true,
  image_headline_primary: "Sua marca, nossa produção premium",
  image_headline_variations: "Private label para marcas que querem escalar\nDa ideia à coleção com padrão premium\nSua coleção com estrutura de fábrica real\nStreetwear premium com produção de verdade\nMais que roupa bonita: produção com consistência",
  image_text_style_instruction: "Texto curto, forte, legível, premium, com contraste alto, hierarquia clara e composição integrada ao layout. Nunca gerar peça sem headline visível.",
  feed_text_overlay_instruction: "Todo feed deve conter headline sobreposta obrigatória com leitura clara e aparência de anúncio premium.",
  story_text_overlay_instruction: "Todo story deve conter texto grande, leitura imediata e estrutura visual de anúncio vertical.",
  reel_text_overlay_instruction: "A capa/thumbnail do reel deve conter headline forte em português e aparência comercial premium.",
  // Chamada do Post — R2PB
  post_caption_cta_primary: "Fale com a R2PB e transforme sua ideia em uma coleção com produção premium de verdade.",
  post_caption_cta_variations: "Descubra como produzir sua marca com estrutura real.\nLeve sua coleção para um padrão premium de produção.\nConstrua sua próxima coleção com um parceiro de private label.\nSua marca pode crescer com produção mais segura e profissional.",
  post_caption_tone: "Premium, comercial, seguro, consultivo e objetivo.",
  post_caption_structure: "Abrir com headline forte, desenvolver com benefício principal, reforçar autoridade e fechar com CTA direto para marcas interessadas em produzir coleção própria.",
  post_caption_instruction_master: "Criar legendas com linguagem comercial premium, foco em captação de marcas, clareza de proposta e percepção de autoridade industrial. Evitar legenda genérica, vaga ou puramente inspiracional.",
  feed_caption_modifier: "Legenda com mais contexto, valor percebido e construção de autoridade.",
  story_caption_modifier: "Legenda curta, direta e imediata, com CTA claro.",
  reel_caption_modifier: "Legenda dinâmica, com gancho inicial forte e CTA objetivo.",
};

function PromptIAPanel({ tenant }: { tenant: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ ok: boolean; settings: PromptSettings | null }>({
    queryKey: ["prompt-settings", tenant],
    queryFn: () => apiFetch(`/marketing/growth/prompt-settings?tenant=${tenant}`),
  });

  const current = data?.settings ?? null;
  const [form, setForm] = useState<Omit<PromptSettings, "tenant_id"> | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const vals: Omit<PromptSettings, "tenant_id"> = form ?? (current ? { ...current } : { ...PS_DEFAULTS });
  const set = (k: keyof Omit<PromptSettings, "tenant_id">, v: string) => setForm(p => ({ ...(p ?? vals), [k]: v }));

  const handleSave = async () => {
    setSaving(true); setToast(null);
    try {
      await apiFetch("/marketing/growth/prompt-settings", {
        method: "PUT",
        body: JSON.stringify({ tenant_id: tenant, ...vals }),
      });
      setToast({ type: "ok", msg: "✓ Configuração salva" });
      setForm(null);
      qc.invalidateQueries({ queryKey: ["prompt-settings", tenant] });
    } catch (e: any) { setToast({ type: "err", msg: `Erro: ${e.message}` }); }
    finally { setSaving(false); setTimeout(() => setToast(null), 3500); }
  };

  const handleReset = () => { setForm({ ...PS_DEFAULTS }); setToast({ type: "ok", msg: "Padrões restaurados — salve para confirmar." }); setTimeout(() => setToast(null), 3500); };

  const composedPreview = [
    vals.image_prompt_master && `[MESTRE — DIREÇÃO VISUAL]\n${vals.image_prompt_master}`,
    vals.feed_prompt_modifier && `[FEED]\n${vals.feed_prompt_modifier}`,
    vals.story_prompt_modifier && `[STORY]\n${vals.story_prompt_modifier}`,
    vals.reel_prompt_modifier && `[REEL]\n${vals.reel_prompt_modifier}`,
    vals.authority_prompt_block && `[AUTORIDADE]\n${vals.authority_prompt_block}`,
    vals.process_prompt_block && `[PROCESSO]\n${vals.process_prompt_block}`,
    vals.lifestyle_prompt_block && `[LIFESTYLE]\n${vals.lifestyle_prompt_block}`,
    vals.product_prompt_block && `[PRODUTO]\n${vals.product_prompt_block}`,
    (vals.color_direction || vals.casting_direction || vals.scenario_direction) && [
      vals.color_direction && `Cores: ${vals.color_direction}`,
      vals.casting_direction && `Modelos: ${vals.casting_direction}`,
      vals.scenario_direction && `Cenários: ${vals.scenario_direction}`,
    ].filter(Boolean).join("\n"),
    vals.negative_prompt && `[PROIBIÇÕES]\n${vals.negative_prompt}`,
    // Camada: Texto na Imagem
    (vals.image_headline_primary || vals.image_headline_variations || vals.image_text_style_instruction) && [
      "━━━ TEXTO NA IMAGEM ━━━",
      vals.text_overlay_required ? "✓ Exigir texto na arte: SIM" : "✗ Exigir texto na arte: NÃO",
      vals.image_headline_primary && `Headline principal: "${vals.image_headline_primary}"`,
      vals.image_headline_variations && `Variações:\n${vals.image_headline_variations}`,
      vals.image_text_style_instruction && `Estilo: ${vals.image_text_style_instruction}`,
      vals.feed_text_overlay_instruction && `Feed overlay: ${vals.feed_text_overlay_instruction}`,
      vals.story_text_overlay_instruction && `Story overlay: ${vals.story_text_overlay_instruction}`,
      vals.reel_text_overlay_instruction && `Reel overlay: ${vals.reel_text_overlay_instruction}`,
    ].filter(Boolean).join("\n"),
    // Camada: Chamada do Post / Legenda
    (vals.post_caption_cta_primary || vals.post_caption_tone || vals.post_caption_instruction_master) && [
      "━━━ CHAMADA DO POST / LEGENDA ━━━",
      vals.post_caption_instruction_master && `Instrução mestre: ${vals.post_caption_instruction_master}`,
      vals.post_caption_cta_primary && `CTA principal: "${vals.post_caption_cta_primary}"`,
      vals.post_caption_cta_variations && `Variações de CTA:\n${vals.post_caption_cta_variations}`,
      vals.post_caption_tone && `Tom de voz: ${vals.post_caption_tone}`,
      vals.post_caption_structure && `Estrutura: ${vals.post_caption_structure}`,
      (vals as any).feed_caption_modifier && `Feed: ${(vals as any).feed_caption_modifier}`,
      (vals as any).story_caption_modifier && `Story: ${(vals as any).story_caption_modifier}`,
      (vals as any).reel_caption_modifier && `Reel: ${(vals as any).reel_caption_modifier}`,
    ].filter(Boolean).join("\n"),
  ].filter(Boolean).join("\n\n---\n\n");

  const TA = ({ label, k, rows = 3, placeholder }: { label: string; k: keyof Omit<PromptSettings,"tenant_id">; rows?: number; placeholder?: string }) => (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{label}</label>
      <textarea rows={rows} value={(vals[k] as string) ?? ""}
        onChange={e => set(k, e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", background: "#ffffff", border: "1px solid #445570", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#1e293b", resize: "vertical", outline: "none", fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box" }}
        onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
        onBlur={e => (e.currentTarget.style.borderColor = "#cbd5e1")}
      />
    </div>
  );

  if (isLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48, color: "#6366f1", gap: 8 }}>
      <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 13, color: "#475569" }}>Carregando configuração…</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1e1b4b,#1a2538)", border: "1px solid #4338ca", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#4338ca)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles style={{ width: 16, height: 16, color: "#1e293b" }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#312e81", margin: 0 }}>Prompt Studio</p>
            <p style={{ fontSize: 11, color: "#818cf8", margin: 0 }}>Direção criativa da IA — tenant: <strong>{tenant}</strong></p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setPreviewOpen(o => !o)}
            style={{ background: "#1e1b4b", border: "1px solid #4338ca", borderRadius: 8, color: "#a5b4fc", fontSize: 11, fontWeight: 700, padding: "6px 14px", cursor: "pointer" }}>
            {previewOpen ? "Fechar preview" : "Ver preview"}
          </button>
          <button onClick={handleReset}
            style={{ background: "transparent", border: "1px solid #445570", borderRadius: 8, color: "#64748b", fontSize: 11, fontWeight: 700, padding: "6px 14px", cursor: "pointer" }}>
            Restaurar padrão
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ background: saving ? "#4338ca99" : "#4f46e5", border: "1px solid #6366f1", borderRadius: 8, color: "#ffffff", fontSize: 12, fontWeight: 700, padding: "7px 20px", cursor: saving ? "default" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            {saving ? <><Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> Salvando…</> : <><Save style={{ width: 13, height: 13 }} /> Salvar</>}
          </button>
        </div>
      </div>

      {toast && (
        <div style={{ padding: "10px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: toast.type === "ok" ? "#052e16" : "#1c0606", border: `1px solid ${toast.type === "ok" ? "#15803d" : "#991b1b"}`, color: toast.type === "ok" ? "#4ade80" : "#fca5a5" }}>
          {toast.msg}
        </div>
      )}

      {/* Preview do prompt composto */}
      {previewOpen && (
        <div style={{ background: "#f1f5f9", border: "1px solid #1e3a5f", borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 10px" }}>Preview do prompt composto que a IA receberá</p>
          <pre style={{ fontSize: 11, color: "#64748b", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, lineHeight: 1.6, maxHeight: 400, overflowY: "auto" }}>{composedPreview || "— Preencha os campos para ver o preview —"}</pre>
        </div>
      )}

      {/* Grid de campos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Bloco 1 — Prompt Mestre */}
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc", margin: 0, display: "flex", alignItems: "center", gap: 6 }}><Wand2 style={{ width: 13, height: 13 }} /> Bloco 1 — Prompt Mestre</p>
          <TA label="Prompt mestre de imagem" k="image_prompt_master" rows={4} placeholder="Instrução principal que guia toda geração de imagens…" />
          <TA label="Prompt mestre de vídeo" k="video_prompt_master" rows={2} placeholder="Instrução para reels e vídeos (HeyGen)…" />
          <TA label="Negative prompt (proibições)" k="negative_prompt" rows={3} placeholder="O que a IA nunca deve fazer ou incluir…" />
        </div>

        {/* Bloco 2 — Variação por Formato */}
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#6ee7b7", margin: 0, display: "flex", alignItems: "center", gap: 6 }}><LayoutGrid style={{ width: 13, height: 13 }} /> Bloco 2 — Variação por Formato</p>
          <TA label="Modificador Feed (4:5)" k="feed_prompt_modifier" rows={3} placeholder="Direção específica para posts de feed…" />
          <TA label="Modificador Story (9:16)" k="story_prompt_modifier" rows={3} placeholder="Direção específica para stories…" />
          <TA label="Modificador Reel (9:16)" k="reel_prompt_modifier" rows={3} placeholder="Direção específica para reels…" />
        </div>

        {/* Bloco 3 — Blocos Estratégicos */}
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#fcd34d", margin: 0, display: "flex", alignItems: "center", gap: 6 }}><Building2 style={{ width: 13, height: 13 }} /> Bloco 3 — Blocos Estratégicos</p>
          <TA label="Autoridade (eixo fábrica)" k="authority_prompt_block" rows={3} placeholder="Como mostrar autoridade industrial da marca…" />
          <TA label="Processo produtivo" k="process_prompt_block" rows={3} placeholder="Cenas de produção, costura, acabamento…" />
          <TA label="Lifestyle / nicho" k="lifestyle_prompt_block" rows={3} placeholder="Estilo de vida, modelo, ambiente da marca…" />
          <TA label="Produto" k="product_prompt_block" rows={2} placeholder="Como mostrar o produto, textura, detalhe…" />
        </div>

        {/* Bloco 4 — Direção Visual */}
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#f9a8d4", margin: 0, display: "flex", alignItems: "center", gap: 6 }}><Palette style={{ width: 13, height: 13 }} /> Bloco 4 — Direção Visual</p>
          <TA label="Paleta de cores" k="color_direction" rows={3} placeholder="Cores principais, combinações, o que evitar…" />
          <TA label="Casting / modelos" k="casting_direction" rows={3} placeholder="Perfil dos modelos, diversidade, expressão…" />
          <TA label="Cenários / ambientes" k="scenario_direction" rows={3} placeholder="Tipos de locação, ambientes, contextos…" />
        </div>

        {/* Bloco 5 — Texto na Imagem */}
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12, gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#34d399", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <Type style={{ width: 13, height: 13 }} /> Bloco 5 — Texto na Imagem
            </p>
            <span style={{ fontSize: 11, color: "#475569" }}>Controla o headline/overlay que aparece <strong style={{ color: "#94a3b8" }}>dentro</strong> da arte</span>
          </div>
          {/* Switch exigir texto */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setForm(p => ({ ...(p ?? vals), text_overlay_required: !(vals as any).text_overlay_required }))}
              style={{
                width: 40, height: 22, borderRadius: 11,
                background: (vals as any).text_overlay_required !== false ? "#22c55e" : "#374151",
                border: "none", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: (vals as any).text_overlay_required !== false ? 20 : 4,
                width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s"
              }} />
            </button>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              Exigir texto na arte — quando ativo, a IA deve incluir headline na imagem gerada
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <TA label="Headline principal" k="image_headline_primary" rows={2}
              placeholder="Ex: Produção pronta para sua próxima coleção." />
            <TA label="Variações de headline (uma por linha)" k="image_headline_variations" rows={4}
              placeholder="Do molde ao acabamento: sem terceiros.\nEscale com quem entende de produção real.\n…" />
            <TA label="Estilo do texto na arte" k="image_text_style_instruction" rows={3}
              placeholder="Ex: Texto bold sans-serif, contraste alto, máx 6 palavras, sem emoji…" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <TA label="Instrução overlay — Feed (4:5)" k="feed_text_overlay_instruction" rows={2}
                placeholder="Ex: Headline no rodapé do feed, fundo leve…" />
              <TA label="Instrução overlay — Story (9:16)" k="story_text_overlay_instruction" rows={2}
                placeholder="Ex: Texto no terço superior, dentro da safe zone…" />
              <TA label="Instrução overlay — Reel (9:16)" k="reel_text_overlay_instruction" rows={2}
                placeholder="Ex: Texto de abertura no centro superior…" />
            </div>
          </div>
        </div>

        {/* Bloco 6 — Chamada do Post / Legenda */}
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12, gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#fb923c", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <MessageSquare style={{ width: 13, height: 13 }} /> Bloco 6 — Chamada do Post / Legenda
            </p>
            <span style={{ fontSize: 11, color: "#475569" }}>Controla o copy da legenda e CTA que acompanha o post</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <TA label="Instrução mestre da copy do post" k="post_caption_instruction_master" rows={4}
              placeholder="Direção geral para a legenda: tom, propósito, o que nunca fazer…" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <TA label="CTA principal da legenda" k="post_caption_cta_primary" rows={2}
                placeholder="Ex: Fale com um especialista" />
              <TA label="Variações de CTA (uma por linha)" k="post_caption_cta_variations" rows={3}
                placeholder="Solicite seu orçamento\nConhece a estrutura\n…" />
            </div>
            <TA label="Tom de voz" k="post_caption_tone" rows={3}
              placeholder="Ex: Confiante, premium, direto. Tom consultivo B2B. Sem clichê de agência…" />
            <TA label="Estrutura da legenda" k="post_caption_structure" rows={3}
              placeholder="Ex: Abrir com headline forte, reforçar autoridade, fechar com CTA…" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <TA label="Variação legenda — Feed" k="feed_caption_modifier" rows={3}
              placeholder="Ex: Legenda com mais contexto, valor percebido e autoridade." />
            <TA label="Variação legenda — Story" k="story_caption_modifier" rows={3}
              placeholder="Ex: Legenda curta, direta e imediata, com CTA claro." />
            <TA label="Variação legenda — Reel" k="reel_caption_modifier" rows={3}
              placeholder="Ex: Legenda dinâmica, com gancho inicial forte e CTA objetivo." />
          </div>
        </div>
      </div>

      <div style={{ padding: "10px 16px", borderRadius: 8, fontSize: 11, color: "#64748b", background: "#ffffff", border: "1px solid #2d3d52" }}>
        💡 Essas configurações são aplicadas <strong style={{ color: "#475569" }}>sobre</strong> o enriquecimento base da IA. Elas entram em toda nova geração de imagem deste tenant. Alterações entram em vigor imediatamente na próxima geração.
      </div>
    </div>
  );
}

type MktSubTab = "campanhas" | "slots" | "criativos" | "curadoria" | "publicacao" | "prompt-ia";

const MKT_SUBTABS: { id: MktSubTab; label: string; icon: React.ElementType }[] = [
  { id: "campanhas",  label: "Campanhas",  icon: Megaphone   },
  { id: "slots",      label: "Slots",      icon: LayoutGrid  },
  { id: "criativos",  label: "Criativos",  icon: Wand2       },
  { id: "curadoria",  label: "Curadoria",  icon: CheckCircle2 },
  { id: "publicacao", label: "Publicação", icon: Send         },
  { id: "prompt-ia",  label: "Prompt IA",  icon: Sparkles    },
];

function TabMarketing({ data, onRefresh, tenant }: { data: CockpitData; onRefresh: () => void; tenant: string }) {
  const qc = useQueryClient();
  const [subTab, setSubTab] = useState<MktSubTab>("campanhas");

  // ── Campanha ativa (contexto global desta aba) ──────────────────────────────
  const [activeCampaign, setActiveCampaign] = useState<Campanha | null>(null);

  // Auto-seleciona a campanha mais recente — sempre atualiza se aparecer campanha nova
  useEffect(() => {
    if (data.campanhas.length === 0) return;
    const sorted = [...data.campanhas].sort((a, b) =>
      new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    );
    const newest = sorted[0];
    // Troca apenas se não há seleção ou se chegou campanha mais nova
    if (!activeCampaign || new Date(newest.created_at ?? 0) > new Date(activeCampaign.created_at ?? 0)) {
      setActiveCampaign(newest);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.campanhas]);

  const handleSelectCampaign = useCallback((c: Campanha) => {
    setActiveCampaign(prev => prev?.id === c.id ? null : c);
  }, []);

  // ── Campanhas — formulário nova ─────────────────────────────────────────────
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
    tenant_id: tenant, name: "", objective: "", channel: "", source: "", angulo: "", oferta: "", observacoes: "",
  });
  // Sincroniza tenant_id quando o operador troca o tenant selecionado
  useEffect(() => {
    setForm(f => ({ ...f, tenant_id: tenant }));
  }, [tenant]);
  const [quotas, setQuotas] = useState({ feed: 1, story: 2, reel: 1 });
  // Stepper inline na aba Slots (quando campanha não tem slots ainda)
  const [slotsQuotas, setSlotsQuotas]     = useState({ feed: 2, story: 3, reel: 1 });
  const [creatingSlots, setCreatingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [campMsg, setCampMsg] = useState<string | null>(null);
  const [autoGenerating, setAutoGenerating] = useState(false); // criativos sendo gerados em bg

  const handleSaveCamp = useCallback(async () => {
    if (!form.name) { setCampMsg("Nome da campanha é obrigatório."); return; }
    setSaving(true);
    try {
      const result = await apiFetch("/marketing/growth/campaigns-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const campaignId: string = result?.campaign?.id ?? result?.id;
      // Criar slots a partir das cotas definidas
      const totalSlots = quotas.feed + quotas.story + quotas.reel;
      if (campaignId && totalSlots > 0) {
        try {
          await apiFetch(`/marketing/growth/campaigns-v2/${campaignId}/slots/create-from-quota`, {
            method: "POST",
            body: JSON.stringify({
              feed_count: quotas.feed, story_count: quotas.story, reel_count: quotas.reel,
              objective: form.objective || null,
            }),
          });
        } catch { /* silencioso — slots podem ser criados depois */ }
      }
      setCampMsg(null);
      setShowNew(false);
      setForm({ tenant_id: tenant, name: "", objective: "", channel: "", source: "", angulo: "", oferta: "", observacoes: "" });
      setQuotas({ feed: 1, story: 2, reel: 1 });
      onRefresh();
      if (campaignId) {
        setTimeout(() => setSubTab("slots"), 500);
      }
    } catch (err: any) {
      setCampMsg(err.message ?? "Erro ao salvar campanha");
    } finally {
      setSaving(false);
    }
  }, [form, quotas, onRefresh]);

  // ── Slots da campanha ativa ──────────────────────────────────────────────────
  const { data: slotsData, isLoading: slotsLoading, refetch: refetchSlots } = useQuery<{ ok: boolean; slots: CampaignSlot[] }>({
    queryKey: ["mkt-slots", activeCampaign?.id],
    queryFn: () => apiFetch(`/marketing/growth/campaigns-v2/${activeCampaign!.id}/slots`),
    enabled: !!activeCampaign,
    staleTime: 10_000,
    refetchInterval: (query) => {
      const d = query.state.data as { slots?: CampaignSlot[] } | undefined;
      const hasInProgress = d?.slots?.some(s => ["generating", "pending_generation"].includes(s.status));
      return hasInProgress ? 8_000 : false;
    },
  });
  const allSlots = slotsData?.slots ?? [];

  const handleGenerateSlot = useCallback(async (slotId: string, refino?: string) => {
    setActionLoading(true);
    try {
      await apiFetch(`/marketing/pilotos/slots/${slotId}/generate`, {
        method: "POST",
        body: JSON.stringify({ context_note: refino?.trim() || null }),
      });
      await qc.invalidateQueries({ queryKey: ["mkt-slots", activeCampaign?.id] });
    } catch (err: any) { alert(err.message ?? "Erro ao gerar"); }
    finally { setActionLoading(false); }
  }, [qc, activeCampaign?.id]);

  // Criar slots inline (sem sair da aba Slots)
  const handleCreateSlotsInline = useCallback(async () => {
    if (!activeCampaign) return;
    setCreatingSlots(true);
    try {
      await apiFetch(`/marketing/growth/campaigns-v2/${activeCampaign.id}/slots/create-from-quota`, {
        method: "POST",
        body: JSON.stringify({
          feed_count:  slotsQuotas.feed,
          story_count: slotsQuotas.story,
          reel_count:  slotsQuotas.reel,
          objective:   activeCampaign.objective ?? null,
        }),
      });
      await qc.invalidateQueries({ queryKey: ["mkt-slots", activeCampaign.id] });
    } catch (err: any) { alert(err.message ?? "Erro ao criar slots"); }
    finally { setCreatingSlots(false); }
  }, [activeCampaign, slotsQuotas, qc]);

  // Gerar todos os slots pendentes de uma vez — sem prompt manual, sistema auto-constrói
  const handleGenerateAll = useCallback(async () => {
    if (!activeCampaign) return;
    const pending = allSlots.filter(s => s.status === "pending_generation");
    setActionLoading(true);
    try {
      for (const slot of pending) {
        await apiFetch(`/marketing/pilotos/slots/${slot.id}/generate`, {
          method: "POST",
          body: JSON.stringify({}),
        });
      }
      await qc.invalidateQueries({ queryKey: ["mkt-slots", activeCampaign.id] });
    } catch (err: any) { alert(err.message ?? "Erro ao gerar slots"); }
    finally { setActionLoading(false); }
  }, [activeCampaign, allSlots, qc]);

  const handleRegenerateSlot = useCallback(async (slotId: string, refino?: string) => {
    setActionLoading(true);
    try {
      // Regenerate já reseta o slot E chama generate internamente — só precisamos passar o refino opcional
      await apiFetch(`/marketing/pilotos/slots/${slotId}/regenerate`, {
        method: "POST",
        body: JSON.stringify({ context_note: refino?.trim() || null }),
      });
      await qc.invalidateQueries({ queryKey: ["mkt-slots", activeCampaign?.id] });
      await qc.invalidateQueries({ queryKey: ["mkt-assets"] });
    } catch (err: any) { alert(err.message ?? "Erro ao regenerar"); }
    finally { setActionLoading(false); }
  }, [qc, activeCampaign?.id]);

  // ── Assets (sempre carregados; polling acelerado enquanto auto-gerando) ───────
  const { data: assetsData, isLoading: assetsLoading, refetch: refetchAssets } = useQuery<{ ok: boolean; assets: GrowthAsset[] }>({
    queryKey: ["mkt-assets"],
    queryFn: () => apiFetch("/marketing/pilotos/assets"),
    refetchOnWindowFocus: false,
    staleTime: 15_000,
    // Polling: durante auto-gen OU enquanto há assets em processamento
    refetchInterval: (query) => {
      if (autoGenerating) return 5_000;
      const data = query.state.data as { assets?: Array<{ status: string }> } | undefined;
      const hasInProgress = data?.assets?.some(a => ["requested", "generating"].includes(a.status));
      return hasInProgress ? 8_000 : false;
    },
  });
  const allAssets     = assetsData?.assets ?? [];
  const tenantAssets  = allAssets.filter(a => a.tenantId === tenant);

  // Filtro por campanha ativa
  const campAssets  = activeCampaign
    ? tenantAssets.filter(a => a.campaignId === activeCampaign.id)
    : tenantAssets;

  const pendingCount  = tenantAssets.filter(a => a.status === "awaiting_approval").length;
  const approvedCount = tenantAssets.filter(a => a.status === "approved").length;

  const [selected,      setSelected]      = useState<GrowthAsset | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleApprove = useCallback(async (assetId: string) => {
    setActionLoading(true);
    try {
      await apiFetch(`/marketing/pilotos/assets/${assetId}/approve`, { method: "POST" });
      await qc.invalidateQueries({ queryKey: ["mkt-assets"] });
      setSelected(prev => prev?.id === assetId ? { ...prev, status: "approved" } : prev);
    } catch (err: any) { alert(err.message ?? "Erro"); }
    finally { setActionLoading(false); }
  }, [qc]);

  const handleDiscard = useCallback(async (assetId: string) => {
    setActionLoading(true);
    try {
      await apiFetch(`/marketing/pilotos/assets/${assetId}/status`, { method: "POST", body: JSON.stringify({ status: "rejected" }) });
      await qc.invalidateQueries({ queryKey: ["mkt-assets"] });
      setSelected(prev => prev?.id === assetId ? { ...prev, status: "rejected" } : prev);
    } catch (err: any) { alert(err.message ?? "Erro"); }
    finally { setActionLoading(false); }
  }, [qc]);

  const handlePublish = useCallback(async (assetId: string, destination: string, mode: string, scheduledAt?: string, captionOverride?: string) => {
    setActionLoading(true);
    try {
      await apiFetch(`/marketing/pilotos/assets/${assetId}/publish`, {
        method: "POST",
        body: JSON.stringify({ destination, mode, scheduled_at: scheduledAt, ...(captionOverride !== undefined ? { caption_override: captionOverride } : {}) }),
      });
      await qc.invalidateQueries({ queryKey: ["mkt-assets"] });
      const newStatus = mode === "scheduled" ? "scheduled" : "published";
      setSelected(prev => prev?.id === assetId ? { ...prev, status: newStatus, publishDestination: destination, scheduledAt: scheduledAt ?? null, publishedAt: mode === "immediate" ? new Date().toISOString() : null } : prev);
    } catch (err: any) { alert(err.message ?? "Erro ao publicar"); }
    finally { setActionLoading(false); }
  }, [qc]);

  // ── Geração de criativos ────────────────────────────────────────────────────
  type CreativeType = "streetwear" | "fitness" | "alfaiataria" | "generico" | "autoridade_fabrica";
  const [imgPrompt,    setImgPrompt]    = useState("");
  const [ctype,        setCtype]        = useState<CreativeType>("streetwear");
  const [genTitle,     setGenTitle]     = useState("");
  const [genCtx,       setGenCtx]       = useState("");
  const [ratio,        setRatio]        = useState("1:1");
  const [imgProvider,  setImgProvider]  = useState<"banana" | "openai-image">("openai-image");
  const [genLoading,   setGenLoading]   = useState(false);
  const [genOk,        setGenOk]        = useState(false);
  const [genErr,       setGenErr]       = useState<string | null>(null);

  // Auto-preenche o formulário quando uma campanha é selecionada
  useEffect(() => {
    if (!activeCampaign) return;
    const c = activeCampaign as any;
    // Detecta linha visual pelo canal/ângulo da campanha
    const raw = `${c.channel ?? ""} ${c.angulo ?? ""} ${c.name ?? ""}`.toLowerCase();
    const detectedType: CreativeType =
      /fabrica|corte|costura|bordado|estamparia|modelagem|cad|produt|confec|ateliê|setor/.test(raw) ? "autoridade_fabrica" :
      /fitness|performance|esport|treino|academia/.test(raw) ? "fitness" :
      /alfaiat|executiv|social|premium social/.test(raw) ? "alfaiataria" :
      /street|urban|hype|skate|cap|beg/.test(raw) ? "streetwear" : "generico";

    // Monta prompt padrão a partir dos dados da campanha
    const defaultPrompt = [
      c.angulo ? `Campanha: ${c.angulo}` : null,
      c.oferta ? `Oferta: ${c.oferta}` : null,
      c.channel ? `Canal: ${c.channel}` : null,
      `Linha: ${detectedType} — private label premium R2PB`,
      "Modelo, peça de roupa em destaque, ambiente coerente, luz natural editorial",
    ].filter(Boolean).join(". ");

    setImgPrompt(prev => prev.trim() ? prev : defaultPrompt);
    setGenTitle(prev => prev.trim() ? prev : c.name ?? "");
    setGenCtx(prev => prev.trim() ? prev : (c.objective ?? c.oferta ?? ""));
    setCtype(detectedType);
  }, [activeCampaign?.id]);

  const handleGenerate = async () => {
    const promptToUse = imgPrompt.trim();
    if (!promptToUse) return;
    setGenLoading(true); setGenErr(null); setGenOk(false);
    try {
      await apiFetch("/marketing/pilotos/gerar-imagem", {
        method: "POST",
        body: JSON.stringify({
          image_prompt: imgPrompt,
          creative_type: ctype,
          title: genTitle || null,
          context_note: genCtx || null,
          aspect_ratio: ratio,
          campaign_id: activeCampaign?.id ?? null,
          provider: imgProvider,
        }),
      });
      setGenOk(true);
      setImgPrompt(""); setGenTitle(""); setGenCtx("");
      await qc.invalidateQueries({ queryKey: ["mkt-assets"] });
      setTimeout(() => setSubTab("curadoria"), 2000);
    } catch (err: any) {
      setGenErr(err.message ?? "Erro ao gerar imagem");
    } finally {
      setGenLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Sub-tab nav */}
      <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-white/[0.06]">
        {MKT_SUBTABS.map(t => {
          const Icon = t.icon;
          const isCuradoria = t.id === "curadoria" && pendingCount > 0;
          return (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all relative ${
                subTab === t.id
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-900/30"
                  : "text-gray-500 hover:text-slate-700 hover:bg-slate-50"
              }`}>
              <Icon className="w-3 h-3" />
              {t.label}
              {isCuradoria && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Barra de contexto: campanha ativa */}
      {activeCampaign && (
        <div style={{ background: "linear-gradient(90deg,#1e1b4b 0%,#1a2538 100%)", border: "1px solid #4338ca", borderRadius: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <Megaphone style={{ width: 13, height: 13, color: "#818cf8", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#312e81" }}>{activeCampaign.name}</span>
            <span style={{ fontSize: 10, color: "#6366f1", margin: "0 6px" }}>·</span>
            {activeCampaign.channel && <span style={{ fontSize: 10, color: "#818cf8" }}>{activeCampaign.channel}</span>}
            {activeCampaign.oferta && <><span style={{ fontSize: 10, color: "#6366f1", margin: "0 6px" }}>·</span><span style={{ fontSize: 10, color: "#64748b" }}>{activeCampaign.oferta}</span></>}
          </div>
          <button
            onClick={async () => {
              if (!window.confirm(`DELETAR campanha "${activeCampaign.name}"?\n\nIsso apaga todos os slots e criativos. Não tem volta.`)) return;
              try {
                await apiFetch(`/marketing/growth/campaigns-v2/${activeCampaign.id}`, { method: "DELETE" });
                setActiveCampaign(null);
                onRefresh();
              } catch (err: any) { alert("Erro ao deletar: " + (err.message ?? "falha")); }
            }}
            style={{ background: "#7f1d1d", border: "1px solid #ef4444", borderRadius: 6, color: "#fca5a5", fontSize: 10, fontWeight: 700, padding: "3px 10px", cursor: "pointer", whiteSpace: "nowrap" }}>
            🗑 Deletar
          </button>
          <button onClick={() => setActiveCampaign(null)}
            style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }}
            title="Desselecionar campanha">
            <X style={{ width: 12, height: 12 }} />
          </button>
        </div>
      )}

      {/* ── Sub: Campanhas ── */}
      {subTab === "campanhas" && (
        <div className="space-y-4">
          {campMsg && (
            <div className={`text-xs px-4 py-2 rounded-lg ${campMsg.startsWith("Campanha") ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
              {campMsg}
            </div>
          )}
          <SectionCard title="Campanhas" icon={Megaphone}
            action={
              <button onClick={() => { setShowNew(!showNew); setCampMsg(null); }}
                className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300">
                <Plus className="w-3 h-3" /> Nova
              </button>
            }>

            {/* Hint: clique para selecionar */}
            {data.campanhas.length > 0 && !activeCampaign && (
              <p className="text-[10px] text-gray-600 mb-3 flex items-center gap-1">
                <ChevronRight className="w-3 h-3" /> Clique numa campanha para ativá-la e ver criativos, curadoria e publicação vinculados.
              </p>
            )}

            {showNew && (
              <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-3 border border-violet-500/20">
                <p className="text-xs font-semibold text-violet-300 mb-2">Nova campanha</p>
                <div className="grid grid-cols-2 gap-3">
                  {[{ k: "name", label: "Nome *" }, { k: "objective", label: "Objetivo" }, { k: "channel", label: "Canal" }, { k: "source", label: "Source / UTM" }].map(({ k, label }) => (
                    <div key={k}>
                      <label className="text-[10px] text-gray-500 block mb-1">{label}</label>
                      <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
                        value={form[k] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                {[{ k: "angulo", label: "Ângulo criativo" }, { k: "oferta", label: "Oferta principal" }].map(({ k, label }) => (
                  <div key={k}>
                    <label className="text-[10px] text-gray-500 block mb-1">{label}</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
                      value={form[k] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))} />
                  </div>
                ))}

                {/* Campos de hipótese estratégica */}
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-[10px] text-violet-400 font-bold uppercase tracking-wide mb-2">🧠 Hipótese criativa</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Nicho</label>
                      <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
                        placeholder="Ex: streetwear, fitness premium"
                        value={form.nicho ?? ""} onChange={(e) => setForm((p) => ({ ...p, nicho: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Estágio do funil</label>
                      <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
                        value={form.estagio_funil ?? ""} onChange={(e) => setForm((p) => ({ ...p, estagio_funil: e.target.value }))}>
                        <option value="">— selecionar —</option>
                        <option value="topo — awareness">Topo — awareness</option>
                        <option value="meio — consideração">Meio — consideração</option>
                        <option value="fundo — conversão">Fundo — conversão</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-gray-500 block mb-1">Intenção criativa</label>
                      <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
                        value={form.intencao_criativa ?? ""} onChange={(e) => setForm((p) => ({ ...p, intencao_criativa: e.target.value }))}>
                        <option value="">— selecionar —</option>
                        <option value="autoridade">Autoridade</option>
                        <option value="captação">Captação</option>
                        <option value="prova">Prova</option>
                        <option value="conversão">Conversão</option>
                        <option value="reposicionamento">Reposicionamento</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Modo Criativo — exclusivo Mirage/Moda Conecta */}
                {form.tenant_id === "mirage" && (
                  <div className="pt-2 border-t border-emerald-500/20">
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide mb-2">🎨 Modo Criativo — Moda Conecta</p>
                    <p className="text-[9px] text-gray-400 mb-2">Define a direção visual, composição e semântica das peças geradas. Deixe em branco para inferência automática pelo contexto da campanha.</p>
                    <select className="w-full bg-white border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-400"
                      value={form.creative_mode ?? ""} onChange={(e) => setForm((p) => ({ ...p, creative_mode: e.target.value }))}>
                      <option value="">— inferir automaticamente —</option>
                      <option value="institucional">🏛 Manifesto Institucional — arquitetura, autoridade, identidade de marca</option>
                      <option value="comunidade">🤝 Comunidade e Conexões — pessoas, networking, relações B2B</option>
                      <option value="curadoria_b2b">✦ Curadoria B2B — seleção, qualidade, flat lay premium</option>
                      <option value="captacao_fornecedores">📦 Captação de Fornecedores — showroom + oportunidade digital</option>
                      <option value="captacao_marcas">🏷 Captação de Marcas — designer/comprador encontrando parceiros</option>
                      <option value="ecossistema_editorial">🌐 Ecossistema Editorial — network visual, gráfico, editorial</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Observações</label>
                  <textarea className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50 resize-none" rows={2}
                    value={form.observacoes ?? ""} onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))} />
                </div>
                {/* Cotas de formato */}
                <div>
                  <label className="text-[10px] text-violet-400 font-bold block mb-2 uppercase tracking-wide">📐 Mix de Formatos — quantos criativos criar</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { key: "feed" as const,  emoji: "📸", label: "Feed" },
                      { key: "story" as const, emoji: "📱", label: "Stories" },
                      { key: "reel" as const,  emoji: "🎬", label: "Reels" },
                    ]).map(({ key, emoji, label }) => (
                      <div key={key} style={{ background: "#ffffff", border: "1px solid #2d3d52", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                        <div style={{ fontSize: 16, marginBottom: 4 }}>{emoji}</div>
                        <div style={{ fontSize: 9, color: "#475569", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <button type="button" onClick={() => setQuotas(q => ({ ...q, [key]: Math.max(0, q[key] - 1) }))}
                            style={{ background: "#e2e8f0", border: "none", color: "#64748b", width: 22, height: 22, borderRadius: 4, cursor: "pointer", fontSize: 14, lineHeight: 1 }}>−</button>
                          <span style={{ fontSize: 16, fontWeight: 900, color: "#1e293b", minWidth: 16 }}>{quotas[key]}</span>
                          <button type="button" onClick={() => setQuotas(q => ({ ...q, [key]: q[key] + 1 }))}
                            style={{ background: "#e2e8f0", border: "none", color: "#64748b", width: 22, height: 22, borderRadius: 4, cursor: "pointer", fontSize: 14, lineHeight: 1 }}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 9, color: "#cbd5e1", marginTop: 6 }}>
                    {quotas.feed + quotas.story + quotas.reel} slot{quotas.feed + quotas.story + quotas.reel !== 1 ? "s" : ""} criados automaticamente ao salvar.
                    Cada slot nasce com o formato correto — não há escolha manual depois.
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowNew(false)} className="text-xs text-gray-500 hover:text-white px-3 py-1.5 rounded-lg border border-slate-200">Cancelar</button>
                  <button disabled={saving} onClick={handleSaveCamp}
                    className="flex items-center gap-1 text-xs bg-violet-600 hover:bg-violet-500 text-white px-4 py-1.5 rounded-lg disabled:opacity-50">
                    <Save className="w-3 h-3" /> {saving ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              </div>
            )}

            <MiniTable
              rows={data.campanhas}
              empty="Nenhuma campanha registrada ainda."
              selectedId={activeCampaign?.id}
              onRowClick={handleSelectCampaign}
              cols={[
                { h: "Campanha",  cell: (c) => <span className="font-medium text-slate-900">{c.name}</span> },
                { h: "Canal",     cell: (c) => c.channel ?? "—" },
                { h: "Oferta",    cell: (c) => <span className="truncate block max-w-[140px]">{c.oferta ?? "—"}</span> },
                { h: "Leads",     cell: (c) => String(c.leads_gerados) },
                { h: "Status",    cell: (c) => (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.status === "active" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-gray-400"}`}>{c.status}</span>
                )},
                { h: "Criada",    cell: (c) => fmtDate(c.created_at) },
                { h: "", cell: (c) => (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm(`Deletar "${c.name}" e todos os criativos?`)) return;
                      try {
                        await apiFetch(`/marketing/growth/campaigns-v2/${c.id}`, { method: "DELETE" });
                        if (activeCampaign?.id === c.id) setActiveCampaign(null);
                        onRefresh();
                      } catch (err: any) { alert(err.message ?? "Erro ao deletar"); }
                    }}
                    className="text-red-500 hover:text-red-400 text-xs px-2 py-0.5 rounded border border-red-900 hover:border-red-700 bg-transparent"
                    title="Deletar campanha"
                  >🗑</button>
                )},
              ]}
            />

            {/* Detalhe inline da campanha selecionada */}
            {activeCampaign && (
              <div style={{ marginTop: 16, background: "#f8fafc", border: "1px solid #2d3d52", borderRadius: 12, padding: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Detalhes da campanha</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
                  {([
                    { label: "Objetivo",         value: activeCampaign.objective },
                    { label: "Canal",            value: activeCampaign.channel },
                    { label: "Ângulo criativo",  value: activeCampaign.angulo },
                    { label: "Oferta",           value: activeCampaign.oferta },
                    { label: "Source / UTM",     value: activeCampaign.source },
                    { label: "Status",           value: activeCampaign.status },
                    { label: "Nicho",            value: activeCampaign.nicho },
                    { label: "Intenção criativa",value: activeCampaign.intencao_criativa },
                    { label: "Estágio do funil", value: activeCampaign.estagio_funil },
                  ] as { label: string; value: string | null }[]).map(({ label, value }) => value ? (
                    <div key={label}>
                      <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
                      <p style={{ fontSize: 12, color: "#cbd5e1", margin: "2px 0 0" }}>{value}</p>
                    </div>
                  ) : null)}
                </div>
                {activeCampaign.observacoes && (
                  <div style={{ marginTop: 10 }}>
                    <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Observações</span>
                    <p style={{ fontSize: 12, color: "#cbd5e1", margin: "2px 0 0" }}>{activeCampaign.observacoes}</p>
                  </div>
                )}
                <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => setSubTab("slots")}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", borderRadius: 8, color: "#ffffff", fontSize: 12, fontWeight: 700, padding: "7px 14px", cursor: "pointer" }}>
                    <LayoutGrid style={{ width: 12, height: 12 }} /> Gerar por Slots
                  </button>
                  <button onClick={() => setSubTab("curadoria")}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "1px solid #445570", borderRadius: 8, color: "#64748b", fontSize: 12, padding: "7px 14px", cursor: "pointer" }}>
                    <CheckCircle2 style={{ width: 12, height: 12 }} /> Curadoria
                  </button>
                  <button onClick={() => setSubTab("publicacao")}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "1px solid #445570", borderRadius: 8, color: "#64748b", fontSize: 12, padding: "7px 14px", cursor: "pointer" }}>
                    <Send style={{ width: 12, height: 12 }} /> Publicação
                  </button>
                  {/* Deletar campanha — limpa slots + assets */}
                  <button onClick={async () => {
                    if (!window.confirm(`Deletar campanha "${activeCampaign.name}" e todos os seus criativos? Esta ação não tem volta.`)) return;
                    try {
                      await apiFetch(`/marketing/growth/campaigns-v2/${activeCampaign.id}`, { method: "DELETE" });
                      setActiveCampaign(null);
                      onRefresh();
                    } catch (err: any) { alert(err.message ?? "Erro ao deletar campanha"); }
                  }}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "1px solid #7f1d1d", borderRadius: 8, color: "#f87171", fontSize: 12, padding: "7px 14px", cursor: "pointer", marginLeft: "auto" }}>
                    🗑 Deletar
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── Sub: Slots ── */}
      {subTab === "slots" && (() => {
        const SLOT_STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
          pending_generation: { label: "Aguardando",      color: "#475569", bg: "#1a2538", border: "#e2e8f0"  },
          pending_video:      { label: "📹 Vídeo pendente", color: "#a78bfa", bg: "#130f2a", border: "#4338ca"  },
          generating:         { label: "Gerando…",        color: "#60a5fa", bg: "#0c1a2e", border: "#1e3a5f"  },
          generated:          { label: "Gerado",          color: "#f59e0b", bg: "#1c1407", border: "#92400e"  },
          approved:           { label: "Aprovado",        color: "#22c55e", bg: "#052e16", border: "#15803d"  },
          scheduled:          { label: "Agendado",        color: "#a78bfa", bg: "#1e1b4b", border: "#4338ca"  },
          published:          { label: "Publicado",       color: "#34d399", bg: "#022c22", border: "#065f46"  },
          rejected:           { label: "Rejeitado",       color: "#ef4444", bg: "#1c0606", border: "#991b1b"  },
        };
        const SLOT_TYPE_EMOJI: Record<string, string> = { feed: "📸", story: "📱", reel: "🎬" };
        const SLOT_TYPE_LABEL: Record<string, string> = { feed: "Feed", story: "Stories", reel: "Reels" };

        function SlotCard({ slot }: { slot: CampaignSlot }) {
          const [prompt, setPrompt] = useState("");
          const [expanded, setExpanded] = useState(false);
          const cfg = SLOT_STATUS_CFG[slot.status] ?? SLOT_STATUS_CFG.pending_generation;
          const canGenerate    = ["pending_generation"].includes(slot.status) && slot.slotType !== "reel";
          // "generating" incluso para desbloquear slots travados no background
          const canRegenerate  = ["generated", "approved", "rejected", "generating"].includes(slot.status) && slot.slotType !== "reel";
          const canGenVideo    = slot.slotType === "reel" && ["pending_video", "pending_generation"].includes(slot.status);
          const canSyncVideo   = slot.slotType === "reel" && ["generating"].includes(slot.status);
          const hasAsset = slot.asset?.outputUrl;

          // Thumbnail aspect ratio matches the actual Instagram format
          const thumbAspect = slot.slotType === "feed" ? "4/5" : "9/16";
          const isReel      = slot.slotType === "reel";

          return (
            <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, overflow: "hidden" }}>
              {/* Thumbnail — aspect-ratio nativo por formato */}
              <div style={{ aspectRatio: thumbAspect, width: "100%", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                {hasAsset
                  ? <img src={`/api/storage${slot.asset!.outputUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : slot.status === "generating"
                    ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <Loader2 style={{ width: 20, height: 20, color: "#60a5fa", animation: "spin 1s linear infinite" }} />
                        <span style={{ fontSize: 9, color: "#64748b" }}>Gerando…</span>
                      </div>
                    : slot.status === "pending_video"
                      ? <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, padding: "10px", width: "100%", height: "100%", justifyContent: "center", boxSizing: "border-box" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontSize: 18 }}>🎬</span>
                            <span style={{ fontSize: 9, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Roteiro pronto</span>
                          </div>
                          {slot.asset?.caption && (
                            <p style={{ fontSize: 9, color: "#64748b", lineHeight: 1.5, margin: 0, maxHeight: 80, overflow: "hidden" }}>
                              {slot.asset.caption}
                            </p>
                          )}
                          <span style={{ fontSize: 8, color: "#64748b" }}>Aguardando pipeline de vídeo</span>
                        </div>
                    : isReel
                      ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "0 8px", textAlign: "center" }}>
                          <span style={{ fontSize: 28 }}>🎬</span>
                          <span style={{ fontSize: 9, color: "#64748b", fontWeight: 700 }}>Slot de Reel</span>
                          <span style={{ fontSize: 8, color: "#cbd5e1", lineHeight: 1.4 }}>Aguardando geração</span>
                        </div>
                      : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 24 }}>{SLOT_TYPE_EMOJI[slot.slotType]}</span>
                          <span style={{ fontSize: 9, color: "#cbd5e1" }}>{SLOT_TYPE_LABEL[slot.slotType]} {slot.slotIndex}</span>
                        </div>}
                {/* Status badge */}
                <span style={{ position: "absolute", top: 5, left: 6, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 12, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                  {cfg.label}
                </span>
                {slot.isExtra && (
                  <span style={{ position: "absolute", top: 5, right: 6, fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 10, background: "#1c1a2e", color: "#818cf8", border: "1px solid #312e81" }}>
                    RESERVA
                  </span>
                )}
                {/* Botão ver asset */}
                {hasAsset && (
                  <button onClick={() => setSelected(slot.asset!)} style={{ position: "absolute", inset: 0, background: "transparent", border: "none", cursor: "pointer" }} />
                )}
              </div>

              <div style={{ padding: "7px 9px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, marginBottom: 4, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
                  <span>{SLOT_TYPE_EMOJI[slot.slotType]} {SLOT_TYPE_LABEL[slot.slotType]} #{slot.slotIndex}</span>
                  {slot.plannedDate && <span style={{ fontSize: 9, color: "#64748b", fontWeight: 400 }}>{slot.plannedDate}</span>}
                  {slot.usage_type && slot.usage_type !== "organic" && (
                    <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 8, background: slot.usage_type === "paid_social" ? "#1c1a00" : "#0a1a1c", color: slot.usage_type === "paid_social" ? "#fbbf24" : "#34d399", border: `1px solid ${slot.usage_type === "paid_social" ? "#92400e" : "#065f46"}` }}>
                      {slot.usage_type === "paid_social" ? "💰 Pago" : "⚡ Híbrido"}
                    </span>
                  )}
                  {slot.creative_archetype && (() => {
                    const ARCHETYPE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
                      authority:         { bg: "#1c1a00", color: "#fbbf24", border: "#92400e" },
                      process:           { bg: "#0a1628", color: "#60a5fa", border: "#1e3a5f" },
                      product:           { bg: "#0f172a", color: "#a5b4fc", border: "#312e81" },
                      behind_scenes:     { bg: "#1a0a1c", color: "#c084fc", border: "#6b21a8" },
                      conversion_cta:    { bg: "#052e16", color: "#34d399", border: "#065f46" },
                      social_proof:      { bg: "#0c1a0a", color: "#86efac", border: "#166534" },
                      brand_positioning: { bg: "#1c0606", color: "#fca5a5", border: "#991b1b" },
                      launch_teaser:     { bg: "#1c0f00", color: "#fb923c", border: "#9a3412" },
                    };
                    const ARCHETYPE_LABELS: Record<string, string> = {
                      authority: "🏭 Autoridade", process: "⚙️ Processo", product: "👕 Produto",
                      behind_scenes: "🎬 Bastidores", conversion_cta: "📲 Conversão",
                      social_proof: "🤝 Prova", brand_positioning: "💎 Posição", launch_teaser: "🚀 Lançamento",
                    };
                    const c = ARCHETYPE_COLORS[slot.creative_archetype] ?? { bg: "#1a2538", color: "#94a3b8", border: "#2d3d52" };
                    return (
                      <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 8, background: c.bg, color: c.color, border: `1px solid ${c.border}`, fontWeight: 700 }}>
                        {ARCHETYPE_LABELS[slot.creative_archetype] ?? slot.creative_archetype}
                      </span>
                    );
                  })()}
                </div>

                {/* Hipótese — metadados do teste criativo */}
                {(slot.hypothesis_angle || slot.pain_point || slot.promise || slot.hook_type) && (
                  <div style={{ marginBottom: 5, padding: "4px 6px", background: "#0c0f1a", borderRadius: 6, border: "1px solid #2d3d52" }}>
                    {slot.hypothesis_angle && (
                      <div style={{ fontSize: 8, color: "#818cf8", fontWeight: 700, marginBottom: 1 }}>
                        ↗ {slot.hypothesis_angle}
                      </div>
                    )}
                    {slot.pain_point && (
                      <div style={{ fontSize: 8, color: "#f87171" }}>Dor: {slot.pain_point}</div>
                    )}
                    {slot.promise && (
                      <div style={{ fontSize: 8, color: "#34d399" }}>Promessa: {slot.promise}</div>
                    )}
                    {slot.hook_type && (
                      <div style={{ fontSize: 8, color: "#fbbf24" }}>Hook: {slot.hook_type}</div>
                    )}
                  </div>
                )}

                {/* Ações */}
                {canGenerate && (
                  <div style={{ marginTop: 2 }}>
                    {/* Botão gerar direto — sem prompt obrigatório */}
                    <div style={{ display: "flex", gap: 4, marginBottom: expanded ? 4 : 0 }}>
                      <button onClick={() => handleGenerateSlot(slot.id, expanded ? prompt : undefined)}
                        disabled={actionLoading}
                        style={{ flex: 1, background: actionLoading ? "#e2e8f0" : "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", borderRadius: 6, color: "#1e293b", fontSize: 9, fontWeight: 700, padding: "5px 0", cursor: actionLoading ? "default" : "pointer" }}>
                        {actionLoading ? "…" : "✦ Gerar"}
                      </button>
                      <button onClick={() => setExpanded(v => !v)}
                        title="Refino opcional"
                        style={{ background: expanded ? "#1e1b4b" : "transparent", border: `1px solid ${expanded ? "#4338ca" : "#e2e8f0"}`, borderRadius: 6, color: expanded ? "#a5b4fc" : "#7b8fa8", fontSize: 9, padding: "5px 8px", cursor: "pointer" }}>
                        ✎
                      </button>
                    </div>
                    {/* Campo de refino — só aparece quando o lápis está ativo */}
                    {expanded && (
                      <input value={prompt} onChange={e => setPrompt(e.target.value)}
                        placeholder="Refino opcional: ex. mais foco em acabamento…"
                        style={{ width: "100%", background: "#ffffff", border: "1px solid #4338ca", borderRadius: 6, padding: "4px 7px", color: "#c7d2fe", fontSize: 10, boxSizing: "border-box" }} />
                    )}
                  </div>
                )}
                {canRegenerate && (
                  <button onClick={() => handleRegenerateSlot(slot.id)} disabled={actionLoading}
                    style={{ width: "100%", marginTop: 2, background: "transparent", border: "1px solid #445570", borderRadius: 6, color: "#475569", fontSize: 9, fontWeight: 600, padding: "5px 0", cursor: actionLoading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <RefreshCcw style={{ width: 9, height: 9 }} /> Regenerar
                  </button>
                )}
                {canGenVideo && (
                  <button onClick={async () => {
                    setActionLoading(true);
                    try {
                      await apiFetch(`/marketing/growth/slots/${slot.id}/generate-video`, { method: "POST", body: JSON.stringify({}) });
                      refetchSlots();
                    } catch (err: any) {
                      alert(`Erro ao gerar vídeo: ${err.message ?? "falha desconhecida"}`);
                    } finally { setActionLoading(false); }
                  }} disabled={actionLoading}
                    style={{ width: "100%", marginTop: 2, background: actionLoading ? "#e2e8f0" : "linear-gradient(135deg,#4338ca,#7c3aed)", border: "none", borderRadius: 6, color: "#1e293b", fontSize: 9, fontWeight: 700, padding: "5px 0", cursor: actionLoading ? "default" : "pointer" }}>
                    🎬 Gerar vídeo HeyGen
                  </button>
                )}
                {canSyncVideo && (
                  <button onClick={async () => {
                    setActionLoading(true);
                    try {
                      const d = await apiFetch(`/marketing/growth/slots/${slot.id}/sync-video`, { method: "POST" });
                      if (d.status === "generated") refetchSlots();
                      else alert(d.message ?? d.error ?? "Ainda processando…");
                    } catch (err: any) {
                      alert(`Erro ao verificar vídeo: ${err.message ?? "falha desconhecida"}`);
                    } finally { setActionLoading(false); }
                  }} disabled={actionLoading}
                    style={{ width: "100%", marginTop: 2, background: "transparent", border: "1px solid #4338ca", borderRadius: 6, color: "#a78bfa", fontSize: 9, fontWeight: 600, padding: "5px 0", cursor: actionLoading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <RefreshCcw style={{ width: 9, height: 9 }} /> Verificar vídeo
                  </button>
                )}
                {slot.status === "generated" && slot.asset?.outputUrl && (
                  <button onClick={() => handleApprove(slot.asset!.id)} disabled={actionLoading}
                    style={{ width: "100%", marginTop: 2, background: "transparent", border: "1px solid #15803d", borderRadius: 6, color: "#22c55e", fontSize: 9, fontWeight: 700, padding: "5px 0", cursor: actionLoading ? "default" : "pointer" }}>
                    ✓ Aprovar
                  </button>
                )}
              </div>
            </div>
          );
        }

        const pendingCount  = allSlots.filter(s => s.status === "pending_generation").length;
        const generatingCnt = allSlots.filter(s => s.status === "generating").length;
        const approvedCnt   = allSlots.filter(s => s.status === "approved").length;
        const publishedCnt  = allSlots.filter(s => s.status === "published").length;

        return (
          <div className="space-y-4">
            <SectionCard
              title={activeCampaign ? `Slots — ${activeCampaign.name}` : "Slots de Campanha"}
              icon={LayoutGrid}
              action={
                <button onClick={() => { refetchSlots(); qc.invalidateQueries({ queryKey: ["mkt-assets"] }); }}
                  className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-slate-700">
                  <RefreshCw className="w-3 h-3" /> Atualizar
                </button>
              }>

              {!activeCampaign && (
                <div className="text-center py-10 text-gray-600 text-sm">
                  <LayoutGrid className="w-7 h-7 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Selecione uma campanha para ver os slots.</p>
                  <button onClick={() => setSubTab("campanhas")} className="mt-3 text-violet-400 text-xs hover:text-violet-300 underline">
                    Ir para Campanhas →
                  </button>
                </div>
              )}

              {activeCampaign && slotsLoading && (
                <div className="flex items-center justify-center gap-2 py-8 text-gray-600 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando slots…
                </div>
              )}

              {activeCampaign && !slotsLoading && allSlots.length === 0 && (
                <div className="text-center py-10 text-gray-600 text-sm">
                  <LayoutGrid className="w-7 h-7 mx-auto mb-2 opacity-20" />
                  <p className="text-xs mb-3">Esta campanha ainda não tem slots definidos.</p>
                  <button onClick={() => setSubTab("campanhas")} className="text-violet-400 text-xs hover:text-violet-300 underline">
                    Editar cotas na campanha →
                  </button>
                </div>
              )}

              {activeCampaign && !slotsLoading && allSlots.length > 0 && (
                <>
                  {/* Resumo */}
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {[
                      { label: "Total",      v: allSlots.length, c: "#818cf8" },
                      { label: "Pendentes",  v: pendingCount,    c: "#64748b" },
                      { label: "Gerando",    v: generatingCnt,   c: "#60a5fa" },
                      { label: "Aprovados",  v: approvedCnt,     c: "#22c55e" },
                      { label: "Publicados", v: publishedCnt,    c: "#34d399" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "#ffffff", border: "1px solid #2d3d52", borderRadius: 8, padding: "5px 11px", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: s.c }}>{s.v}</span>
                        <span style={{ fontSize: 10, color: "#64748b" }}>{s.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Grupos por tipo */}
                  {(["feed", "story", "reel"] as const).map(type => {
                    const typeSlots = allSlots.filter(s => s.slotType === type && !s.isExtra);
                    const extraSlots = allSlots.filter(s => s.slotType === type && s.isExtra);
                    if (typeSlots.length === 0 && extraSlots.length === 0) return null;
                    return (
                      <div key={type} style={{ marginBottom: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <span style={{ fontSize: 13 }}>{SLOT_TYPE_EMOJI[type]}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#1e293b" }}>{SLOT_TYPE_LABEL[type]}</span>
                          <span style={{ fontSize: 10, background: "#e2e8f0", color: "#475569", borderRadius: 10, padding: "1px 8px" }}>{typeSlots.length} slot{typeSlots.length !== 1 ? "s" : ""}</span>
                        </div>
                        {/* Feed: cards mais largos (4:5); Story/Reel: cards estreitos (9:16) */}
                        <div style={{ display: "grid", gridTemplateColumns: type === "feed" ? "repeat(auto-fill, minmax(120px, 1fr))" : "repeat(auto-fill, minmax(85px, 1fr))", gap: 8 }}>
                          {typeSlots.map(s => <SlotCard key={s.id} slot={s} />)}
                        </div>
                        {extraSlots.length > 0 && (
                          <>
                            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, marginTop: 10, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>
                              Reserva / Extra
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: type === "feed" ? "repeat(auto-fill, minmax(120px, 1fr))" : "repeat(auto-fill, minmax(85px, 1fr))", gap: 8 }}>
                              {extraSlots.map(s => <SlotCard key={s.id} slot={s} />)}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-slate-500/[0.04] border border-slate-500/10 rounded-lg">
                <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="text-[10px] text-slate-400/60">
                  Formato nasce definido na campanha. Feed gera portrait 4:5, Stories/Reels geram vertical 9:16.
                  Regenerar não consome slot novo — mantém o mesmo planejamento.
                </span>
              </div>
            </SectionCard>
          </div>
        );
      })()}

      {/* ── Sub: Criativos ── */}
      {subTab === "criativos" && (
        <div className="space-y-4">
          {/* Galeria de criativos vinculados */}
          <SectionCard title={activeCampaign ? `Criativos — ${activeCampaign.name}` : "Todos os Criativos R2PB"} icon={ImageIcon}
            action={
              <button onClick={() => refetchAssets()} className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-slate-700">
                <RefreshCw className="w-3 h-3" /> Atualizar
              </button>
            }>
            {assetsLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-gray-600 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
              </div>
            ) : campAssets.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-sm">
                <ImageIcon className="w-7 h-7 mx-auto mb-2 opacity-20" />
                <p className="text-xs">{activeCampaign ? "Nenhum criativo gerado para esta campanha ainda." : "Nenhum criativo gerado ainda."}</p>
              </div>
            ) : (
              <>
                <div className="flex gap-3 mb-3 flex-wrap">
                  {[
                    { label: "Total",        value: campAssets.length,                                             color: "#818cf8" },
                    { label: "Em revisão",   value: campAssets.filter(a => a.status === "awaiting_approval").length, color: "#f59e0b" },
                    { label: "Aprovados",    value: campAssets.filter(a => a.status === "approved").length,         color: "#22c55e" },
                    { label: "Com imagem",   value: campAssets.filter(a => a.outputUrl).length,                    color: "#60a5fa" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "#ffffff", border: "1px solid #2d3d52", borderRadius: 8, padding: "6px 12px", display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 15, fontWeight: 900, color: s.color }}>{s.value}</span>
                      <span style={{ fontSize: 10, color: "#64748b" }}>{s.label}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                  {campAssets.map(a => (
                    <AssetThumb key={a.id} asset={a} onClick={() => setSelected(a)} />
                  ))}
                </div>
              </>
            )}
          </SectionCard>

          {/* Formulário de geração — só aparece sem campanha ativa */}
          <SectionCard title={activeCampaign ? "Gerar fora da campanha" : "Gerar Criativo Avulso"} icon={Wand2}>
            {activeCampaign ? (
              <div style={{ background: "#ffffff", border: "1px solid #312e81", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <LayoutGrid style={{ width: 16, height: 16, color: "#6366f1", flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#312e81", margin: "0 0 4px" }}>
                      Campanha ativa: <span style={{ color: "#a5b4fc" }}>{activeCampaign.name}</span>
                    </p>
                    <p style={{ fontSize: 11, color: "#475569", margin: "0 0 10px" }}>
                      Criativos de campanha devem ser gerados pelos <strong style={{ color: "#818cf8" }}>slots</strong> — isso garante o formato correto (feed/stories/reels), o texto dentro da imagem e o controle de cotas.
                    </p>
                    <button onClick={() => setSubTab("slots")}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", borderRadius: 7, color: "#ffffff", fontSize: 12, fontWeight: 700, padding: "7px 14px", cursor: "pointer" }}>
                      <LayoutGrid style={{ width: 12, height: 12 }} /> Ir para Slots da Campanha →
                    </button>
                    <button onClick={() => setActiveCampaign(null)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid #445570", borderRadius: 7, color: "#475569", fontSize: 11, padding: "7px 12px", cursor: "pointer", marginLeft: 8 }}>
                      Gerar avulso mesmo assim
                    </button>
                  </div>
                </div>
              </div>
            ) : (
            <div style={{ background: "#ffffff", border: "1px solid #312e81", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", background: "#1e1b4b", borderBottom: "1px solid #312e81", display: "flex", alignItems: "center", gap: 8 }}>
                <Wand2 style={{ width: 14, height: 14, color: "#818cf8" }} />
                <span style={{ color: "#312e81", fontWeight: 700, fontSize: 13 }}>R2PB Creative</span>
                <span style={{ fontSize: 10, background: imgProvider === "openai-image" ? "#064e3b" : "#312e81", color: imgProvider === "openai-image" ? "#6ee7b7" : "#a5b4fc", borderRadius: 4, padding: "1px 7px", fontWeight: 600 }}>
                  {imgProvider === "openai-image" ? "GPT-Image-2 ✦" : "Banana / Gemini 2.5 Flash"}
                </span>
              </div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".5px" }}>
                    Image Prompt <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <textarea value={imgPrompt} onChange={e => setImgPrompt(e.target.value)} rows={3}
                    placeholder="Descreva o visual: modelo, peça, ambiente, mood…"
                    style={{ width: "100%", background: "#e2e8f0", border: "1px solid #445570", borderRadius: 8, padding: "8px 10px", color: "#0f172a", fontSize: 12, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
                </div>
                {/* Provider selector */}
                <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
                  {(["openai-image", "banana"] as const).map(p => (
                    <button key={p} onClick={() => setImgProvider(p)}
                      style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: `1.5px solid ${imgProvider === p ? (p === "openai-image" ? "#059669" : "#4f46e5") : "#e2e8f0"}`, background: imgProvider === p ? (p === "openai-image" ? "#022c22" : "#1e1b4b") : "#1a2538", color: imgProvider === p ? (p === "openai-image" ? "#6ee7b7" : "#a5b4fc") : "#7b8fa8", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all .15s" }}>
                      {p === "openai-image" ? "✦ GPT-Image-2 (recomendado)" : "Banana / Gemini"}
                    </button>
                  ))}
                </div>
                {imgProvider === "openai-image" && (
                  <p style={{ fontSize: 10, color: "#059669", margin: "0 0 4px", paddingLeft: 2 }}>
                    Melhor para cenas de fábrica e editorial sem texto na imagem
                  </p>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#475569", fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".5px" }}>Linha Visual</label>
                    <select value={ctype} onChange={e => setCtype(e.target.value as CreativeType)}
                      style={{ width: "100%", background: "#e2e8f0", border: "1px solid #445570", borderRadius: 8, padding: "7px 10px", color: "#0f172a", fontSize: 12 }}>
                      <option value="autoridade_fabrica">🏭 Autoridade — Fábrica / Processo</option>
                      <option value="streetwear">🏙 Streetwear Urbano</option>
                      <option value="fitness">⚡ Fitness / Performance</option>
                      <option value="alfaiataria">👔 Alfaiataria Premium</option>
                      <option value="generico">✦ Genérico R2PB</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#475569", fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".5px" }}>Proporção</label>
                    <select value={ratio} onChange={e => setRatio(e.target.value)}
                      style={{ width: "100%", background: "#e2e8f0", border: "1px solid #445570", borderRadius: 8, padding: "7px 10px", color: "#0f172a", fontSize: 12 }}>
                      <option value="1:1">1:1 — Feed quadrado</option>
                      <option value="4:5">4:5 — Feed retrato</option>
                      <option value="9:16">9:16 — Stories / Reels</option>
                      <option value="16:9">16:9 — Horizontal</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#475569", fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".5px" }}>Título</label>
                    <input value={genTitle} onChange={e => setGenTitle(e.target.value)} placeholder="Ex: Lookbook Verão Fitness"
                      style={{ width: "100%", background: "#e2e8f0", border: "1px solid #445570", borderRadius: 8, padding: "7px 10px", color: "#0f172a", fontSize: 12 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#475569", fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".5px" }}>
                      Refino opcional
                    </label>
                    <input value={genCtx} onChange={e => setGenCtx(e.target.value)} placeholder="Ex: mais foco em acabamento, menos costura"
                      style={{ width: "100%", background: "#e2e8f0", border: "1px solid #445570", borderRadius: 8, padding: "7px 10px", color: "#0f172a", fontSize: 12 }} />
                    <p style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                      A campanha já define a direção principal. Use apenas para ajustar o resultado.
                    </p>
                  </div>
                </div>
                {genErr && <div style={{ background: "#1c0606", border: "1px solid #991b1b", borderRadius: 8, padding: "8px 12px", color: "#ef4444", fontSize: 12 }}>{genErr}</div>}
                {genOk  && (
                  <div style={{ background: "#052e16", border: "1px solid #15803d", borderRadius: 8, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                    <CheckCircle2 style={{ width: 16, height: 16, color: "#22c55e", flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 12, color: "#22c55e", fontWeight: 700, margin: 0 }}>Imagem gerada! Redirecionando para Curadoria…</p>
                    </div>
                  </div>
                )}
                <button onClick={handleGenerate} disabled={genLoading || !imgPrompt.trim()}
                  style={{ background: genLoading || !imgPrompt.trim() ? "#e2e8f0" : "linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)", border: "none", borderRadius: 8, padding: "10px 0", color: genLoading || !imgPrompt.trim() ? "#cbd5e1" : "white", fontSize: 13, fontWeight: 700, cursor: genLoading || !imgPrompt.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .15s" }}>
                  {genLoading ? <><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />Gerando — ~30s…</> : <><Wand2 style={{ width: 14, height: 14 }} />Gerar Imagem Premium</>}
                </button>
              </div>
            </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── Sub: Curadoria ── */}
      {subTab === "curadoria" && (
        <SectionCard
          title={activeCampaign ? `Curadoria — ${activeCampaign.name}` : "Curadoria de Assets R2PB"}
          icon={CheckCircle2}
          action={
            <button onClick={() => qc.invalidateQueries({ queryKey: ["mkt-assets"] })}
              className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-slate-700">
              <RefreshCw className="w-3 h-3" /> Atualizar
            </button>
          }>

          {/* Banner auto-geração em andamento */}
          {autoGenerating && (
            <div style={{ background: "linear-gradient(135deg, #1e1b4b, #2d1b69)", border: "1px solid #4c1d95", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin flex-shrink-0" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#c4b5fd" }}>ATHOS está gerando os criativos automaticamente</div>
                <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 2 }}>2–3 imagens em geração (~30s cada). Esta página atualiza sozinha quando ficarem prontos.</div>
              </div>
            </div>
          )}

          <div className="flex gap-3 mb-4 flex-wrap">
            {[
              { label: "Total",       value: campAssets.length,                                               color: "#818cf8" },
              { label: "Em revisão",  value: campAssets.filter(a => a.status === "awaiting_approval").length, color: "#f59e0b" },
              { label: "Aprovados",   value: campAssets.filter(a => a.status === "approved").length,          color: "#22c55e" },
              { label: "Rejeitados",  value: campAssets.filter(a => a.status === "rejected").length,          color: "#ef4444" },
            ].map(s => (
              <div key={s.label} style={{ background: "#ffffff", border: "1px solid #2d3d52", borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 17, fontWeight: 900, color: s.color }}>{s.value}</span>
                <span style={{ fontSize: 11, color: "#64748b" }}>{s.label}</span>
              </div>
            ))}
          </div>

          {assetsLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-600 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" /> Carregando assets…
            </div>
          )}

          {!assetsLoading && campAssets.length === 0 && (
            <div className="text-center py-12 text-gray-600 text-sm">
              <ImageIcon className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p>{activeCampaign ? "Nenhum asset gerado para esta campanha." : "Nenhum asset gerado ainda."}</p>
              <button onClick={() => setSubTab("criativos")} className="mt-3 text-violet-400 text-xs hover:text-violet-300 underline">
                Gerar primeiro criativo →
              </button>
            </div>
          )}

          {!assetsLoading && campAssets.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
              {campAssets.map(a => (
                <AssetThumb key={a.id} asset={a} onClick={() => setSelected(a)} />
              ))}
            </div>
          )}

          <div className="mt-4 px-4 py-2.5 bg-white/[0.02] border border-white/[0.05] rounded-lg flex items-center gap-2 text-[11px] text-gray-600">
            <Send className="w-3 h-3" />
            Assets aprovados ficam disponíveis em Publicação.
          </div>
        </SectionCard>
      )}

      {/* ── Sub: Publicação ── */}
      {subTab === "publicacao" && (() => {
        const approved   = campAssets.filter(a => a.status === "approved");
        const scheduled  = campAssets.filter(a => a.status === "scheduled");
        const published  = campAssets.filter(a => a.status === "published");
        const failed     = campAssets.filter(a => a.status === "publish_failed");
        const pending    = campAssets.filter(a => a.status === "awaiting_approval");
        const draft      = campAssets.filter(a => ["requested","generating"].includes(a.status));

        type PubGroup = { label: string; badge: string; borderColor: string; bgColor: string; textColor: string; assets: GrowthAsset[]; onClick?: () => void; hint?: string };
        const groups: PubGroup[] = [
          { label: "✓ Prontos para publicar",  badge: "#22c55e", borderColor: "#15803d", bgColor: "#0a1a0a", textColor: "#22c55e",  assets: approved  },
          { label: "⏰ Agendados",              badge: "#a78bfa", borderColor: "#4338ca", bgColor: "#1e1b4b", textColor: "#a78bfa",  assets: scheduled },
          { label: "✅ Publicados",             badge: "#34d399", borderColor: "#065f46", bgColor: "#022c22", textColor: "#34d399",  assets: published },
          { label: "⚠️ Falha na publicação",   badge: "#f87171", borderColor: "#991b1b", bgColor: "#1c0606", textColor: "#f87171",  assets: failed    },
          {
            label: "⏳ Em curadoria",          badge: "#f59e0b", borderColor: "#92400e", bgColor: "#1a2538", textColor: "#f59e0b",  assets: pending,
            hint: "Ir para Curadoria →", onClick: () => setSubTab("curadoria"),
          },
          { label: "🔄 Em produção",            badge: "#818cf8", borderColor: "#312e81", bgColor: "#1a2538", textColor: "#64748b",  assets: draft     },
        ].filter(g => g.assets.length > 0);

        return (
          <div className="space-y-4">
            <SectionCard title={activeCampaign ? `Publicação — ${activeCampaign.name}` : "Publicação Social"} icon={Send}
              action={
                <button onClick={() => qc.invalidateQueries({ queryKey: ["mkt-assets"] })}
                  className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-slate-700">
                  <RefreshCw className="w-3 h-3" /> Atualizar
                </button>
              }>

              {/* Stats por destino */}
              {(approved.length > 0 || scheduled.length > 0 || published.length > 0) && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  {(["feed","story","reel"] as const).map(dest => {
                    const n = campAssets.filter(a => a.publishDestination === dest).length;
                    if (!n) return null;
                    return (
                      <div key={dest} style={{ background: "#ffffff", border: "1px solid #2d3d52", borderRadius: 8, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: "#1e293b" }}>{n}</span>
                        <span style={{ fontSize: 10, color: "#64748b" }}>{DEST_LABELS[dest]}</span>
                      </div>
                    );
                  })}
                  {[
                    { label: "Aprovados",  v: approved.length,  c: "#22c55e" },
                    { label: "Agendados",  v: scheduled.length, c: "#a78bfa" },
                    { label: "Publicados", v: published.length, c: "#34d399" },
                  ].filter(s => s.v > 0).map(s => (
                    <div key={s.label} style={{ background: "#ffffff", border: "1px solid #2d3d52", borderRadius: 8, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: s.c }}>{s.v}</span>
                      <span style={{ fontSize: 10, color: "#64748b" }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {assetsLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-gray-600 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
                </div>
              ) : campAssets.length === 0 ? (
                <div className="text-center py-10 text-gray-600 text-sm">
                  <Send className="w-7 h-7 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">{activeCampaign ? "Nenhum criativo nesta campanha ainda." : "Selecione uma campanha para ver o status de publicação."}</p>
                  {activeCampaign && (
                    <button onClick={() => setSubTab("criativos")} className="mt-3 text-violet-400 text-xs hover:text-violet-300 underline">
                      Gerar criativos →
                    </button>
                  )}
                </div>
              ) : groups.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-6">Nenhum criativo nesta visão ainda.</p>
              ) : (
                <div className="space-y-5">
                  {groups.map(g => (
                    <div key={g.label}>
                      <div className="flex items-center gap-2 mb-2">
                        <span style={{ fontSize: 10, fontWeight: 700, color: g.badge, textTransform: "uppercase", letterSpacing: ".07em" }}>{g.label}</span>
                        <span style={{ fontSize: 10, background: `${g.badge}22`, color: g.badge, borderRadius: 20, padding: "1px 8px", fontWeight: 700 }}>{g.assets.length}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                        {g.assets.map(a => (
                          <button key={a.id} onClick={() => setSelected(a)}
                            style={{ background: g.bgColor, border: `1px solid ${g.borderColor}`, borderRadius: 10, overflow: "hidden", cursor: "pointer", textAlign: "left", width: "100%" }}>
                            <div style={{ height: 110, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                              {a.outputUrl
                                ? <img src={`/api/storage${a.outputUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <ImageIcon style={{ width: 20, height: 20, color: g.borderColor }} />}
                              {a.publishDestination && (
                                <span style={{ position: "absolute", bottom: 4, right: 4, fontSize: 8, background: "#000000cc", color: "#1e293b", borderRadius: 4, padding: "1px 5px", fontWeight: 700 }}>
                                  {DEST_LABELS[a.publishDestination] ?? a.publishDestination}
                                </span>
                              )}
                            </div>
                            <div style={{ padding: "5px 7px" }}>
                              {a.scheduledAt && <p style={{ fontSize: 9, color: "#a78bfa", margin: "0 0 1px", fontWeight: 600 }}>⏰ {new Date(a.scheduledAt).toLocaleString("pt-BR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</p>}
                              {a.publishedAt  && <p style={{ fontSize: 9, color: "#34d399", margin: "0 0 1px", fontWeight: 600 }}>✅ {new Date(a.publishedAt).toLocaleString("pt-BR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</p>}
                              <p style={{ fontSize: 10, color: g.textColor, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title ?? "Sem título"}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      {g.hint && g.onClick && (
                        <button onClick={g.onClick} className="mt-2 text-[11px] text-amber-400 hover:text-amber-300 underline">{g.hint}</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Aviso Meta */}
              <div className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-slate-500/[0.05] border border-slate-500/20 rounded-lg">
                <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="text-[11px] text-slate-400/70">R2PB: publica automaticamente no Instagram. Mirage: fila interna — poste manualmente via Meta Business Suite.</span>
              </div>
            </SectionCard>
          </div>
        );
      })()}

      {/* ── Sub: Prompt IA ── */}
      {subTab === "prompt-ia" && (
        <PromptIAPanel tenant={tenant} />
      )}

      {/* Modal de detalhe */}
      {selected && (
        <AssetDetailModal
          asset={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onDiscard={handleDiscard}
          onPublish={handlePublish}
          loading={actionLoading}
        />
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
        <div className="flex items-center gap-1 mb-4 bg-slate-50 rounded-lg p-1 w-fit flex-wrap">
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
              h: "Agente",
              cell: (l) => {
                if (l.human_in_control) {
                  return <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">👤 Humano{l.human_agent_name ? ` (${l.human_agent_name})` : ""}</span>;
                }
                const agentBadges: Record<string, { label: string; cls: string }> = {
                  joana:  { label: "JOANA",  cls: "bg-violet-500/20 text-violet-300" },
                  marcos: { label: "MARCOS", cls: "bg-blue-500/20 text-blue-300" },
                  lia:    { label: "LIA",    cls: "bg-emerald-500/20 text-emerald-300" },
                  caio:   { label: "CAIO",   cls: "bg-orange-500/20 text-orange-300" },
                  carla:  { label: "CARLA",  cls: "bg-pink-500/20 text-pink-300" },
                };
                const agentKey = l.current_agent ?? "joana";
                const badge = agentBadges[agentKey] ?? { label: agentKey.toUpperCase(), cls: "bg-gray-500/20 text-slate-700" };
                return <span className={`text-[10px] ${badge.cls} px-2 py-0.5 rounded-full font-semibold`}>🤖 {badge.label}</span>;
              },
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

function TabAgentes({ data, tenant }: { data: CockpitData; tenant: string }) {
  const { agentes } = data.overview;
  const [, nav] = useLocation();

  return (
    <div className="space-y-6">
      <button
        onClick={() => nav(`/hub/automacao-comercial?company_slug=${tenant}`)}
        className="w-full flex items-center gap-4 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-4 transition-colors group text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
          <MessageSquare className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">Configurar WhatsApp / Z-API</p>
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
                <div key={a.tenant_id} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-violet-400" />
                        <p className="text-sm font-bold text-slate-900">{a.nome}</p>
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
                      <p className="text-xl font-bold text-slate-900">{a.total_leads}</p>
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

function TabConfigIA({ tenant }: { tenant: string }) {
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery<{ ok: boolean; config: AiConfig | null }>({
    queryKey: ["growth-ai-config", tenant],
    queryFn: () => apiFetch(`/marketing/growth/ai-config?tenant=${tenant}`),
  });

  const [form, setForm] = useState<Partial<AiConfig> | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const configData = data?.config ?? null;

  const currentForm = form ?? (configData ? { ...configData } : { tenant_id: tenant });

  const handleSave = useCallback(async () => {
    setSaving(true); setMsg(null);
    try {
      await apiFetch("/marketing/growth/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenant, ...currentForm }),
      });
      setMsg("Configuração salva com sucesso!");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["growth-ai-config", tenant] });
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [currentForm, qc, tenant]);

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
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500/50 resize-y"
                  placeholder={placeholder}
                  value={(currentForm as Record<string, string | null>)[k] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...(p ?? currentForm), [k]: e.target.value }))}
                />
              ) : (
                <input
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500/50"
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
              { h: "Campanha", cell: (c) => <span className="font-medium text-slate-900">{c.name}</span> },
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

// ── BrandingModal ──────────────────────────────────────────────────────────────

function BrandingModal({ tenant, onClose }: { tenant: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ ok: boolean; brand: BrandData | null }>({
    queryKey: ["brand-blueprint", tenant],
    queryFn: () => apiFetch(`/marketing/machine/brand?company_slug=${tenant}`),
  });

  const [form, setForm] = useState<BrandData | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const brand = data?.brand ?? null;
  const current: BrandData = form ?? brand ?? {};

  const set = (k: keyof BrandData, v: string) => setForm(p => ({ ...(p ?? current), [k]: v }));

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      await apiFetch("/marketing/machine/brand", {
        method: "PUT",
        body: JSON.stringify({ company_slug: tenant, ...current }),
      });
      setMsg("Branding salvo ✓");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["brand-blueprint", tenant] });
    } catch (e: any) { setMsg(`Erro: ${e.message}`); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        const r = await apiFetch("/marketing/machine/brand/logo", {
          method: "POST",
          body: JSON.stringify({ company_slug: tenant, filename: file.name, data_base64: base64, mimetype: file.type }),
        });
        setForm(p => ({ ...(p ?? current), logo_url: (r as any).logo_url }));
        qc.invalidateQueries({ queryKey: ["brand-blueprint", tenant] });
      } catch (e: any) { setMsg(`Erro upload: ${e.message}`); }
    };
    reader.readAsDataURL(file);
  };

  const inp = (k: keyof BrandData, label: string, placeholder?: string, area?: boolean) => (
    <div>
      <label className="block text-[11px] text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</label>
      {area
        ? <textarea rows={2} value={(current[k] as string) ?? ""} onChange={e => set(k, e.target.value)}
            placeholder={placeholder}
            className="w-full bg-[#1a2538] border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-gray-600 resize-none focus:outline-none focus:border-violet-500/50" />
        : <input value={(current[k] as string) ?? ""} onChange={e => set(k, e.target.value)}
            placeholder={placeholder}
            className="w-full bg-[#1a2538] border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-gray-600 focus:outline-none focus:border-violet-500/50" />
      }
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#1a2538] border border-slate-200 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold">Branding — <span className="text-violet-400">{tenant}</span></h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {isLoading ? (
            <p className="text-sm text-gray-500 text-center py-8">Carregando…</p>
          ) : (
            <>
              {/* Logo */}
              <div>
                <label className="block text-[11px] text-gray-500 font-medium uppercase tracking-wide mb-2">Logo</label>
                <div className="flex items-center gap-3">
                  {current.logo_url
                    ? <img src={`/api${current.logo_url}`} alt="logo" className="w-12 h-12 object-contain rounded-lg border border-slate-200 bg-white/5" />
                    : <div className="w-12 h-12 rounded-lg border border-dashed border-white/20 flex items-center justify-center bg-white/5"><ImageIcon className="w-5 h-5 text-gray-600" /></div>
                  }
                  <button onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 border border-violet-500/30 rounded-lg px-3 py-1.5">
                    <Upload className="w-3.5 h-3.5" /> Enviar logo
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </div>
              </div>

              {inp("nome_marca", "Nome da marca", "Ex: R2PB Studio")}
              {inp("segmento", "Segmento", "Ex: Moda feminina premium")}
              {inp("cor_primaria", "Cor primária (hex)", "Ex: #7c3aed")}
              {inp("tom_de_voz", "Tom de voz", "Ex: Sofisticado, direto, aspiracional", true)}
              {inp("estilo_visual", "Estilo visual", "Ex: Clean, minimalista, fotografia de alta qualidade", true)}
              {inp("promessa", "Promessa da marca", "Ex: Peças exclusivas feitas para durar", true)}
              {inp("produto_principal", "Produto principal", "Ex: Coleção Essentials")}
              {inp("objetivo_atual", "CTA / Objetivo atual", "Ex: Agendar demonstração")}
              {inp("referencias_esteticas", "Restrições visuais", "Ex: Sem fundo branco, sem texto sobreposto", true)}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 flex items-center justify-between gap-3">
          {msg && <p className={`text-xs flex-1 ${msg.startsWith("Erro") ? "text-red-400" : "text-emerald-400"}`}>{msg}</p>}
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={onClose} className="text-xs text-gray-500 hover:text-white px-4 py-2 rounded-lg">Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg transition-colors">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar branding
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── GrowthHomePage ─────────────────────────────────────────────────────────────

export default function GrowthHomePage() {
  const [, nav] = useLocation();
  const [tab, setTab] = useState<TabId>("visao-geral");
  // "r2pb" é o tenant inicial intencional do dashboard super-admin (tenant primário da plataforma).
  // O operador pode trocar via seletor — todas as ações usam selectedTenant, nunca valor fixo.
  const [selectedTenant, setSelectedTenant] = useState("r2pb");
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const qc = useQueryClient();

  // Lista de tenants para o seletor
  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ["tenants-list"],
    queryFn: () => apiFetch("/tenants"),
    staleTime: 5 * 60_000,
  });

  const tenantLabel = tenants.find(t => t.slug === selectedTenant)?.nome
    ?? tenants.find(t => t.slug === selectedTenant)?.name
    ?? selectedTenant.toUpperCase();

  const { data: cockpit, isLoading, isError, error, refetch } = useQuery<CockpitData>({
    queryKey: ["growth-cockpit", selectedTenant],
    queryFn: () => apiFetch(`/marketing/growth/cockpit?tenant=${selectedTenant}`),
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
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {brandModalOpen && <BrandingModal tenant={selectedTenant} onClose={() => setBrandModalOpen(false)} />}
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start gap-3 mb-8">
          <button onClick={() => nav("/hub")} className="text-gray-500 hover:text-slate-900 transition-colors mt-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Growth</h1>
              <Badge variant="outline" className="bg-violet-100 text-violet-700 border-violet-300">Marketing + Vendas + IA</Badge>
            </div>

            {/* Governa tenant — seletor + ações */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {/* Tenant Selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                <Building2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <select
                  value={selectedTenant}
                  onChange={e => setSelectedTenant(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer pr-1"
                >
                  {tenants.length === 0
                    ? <option value="r2pb">r2pb</option>
                    : tenants.map(t => (
                        <option key={t.slug} value={t.slug}>
                          {t.nome ?? t.name ?? t.slug} ({t.slug})
                        </option>
                      ))
                  }
                </select>
              </div>

              {/* Branding */}
              <button onClick={() => setBrandModalOpen(true)}
                className="flex items-center gap-1.5 text-xs text-violet-300 hover:text-violet-200 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-lg px-3 py-1.5 transition-colors">
                <Palette className="w-3.5 h-3.5" /> Branding
              </button>

              {/* Novo Tenant */}
              <button onClick={() => nav("/hub/checkout")}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-slate-50 hover:bg-white/[0.08] border border-slate-200 rounded-lg px-3 py-1.5 transition-colors">
                <PlusCircle className="w-3.5 h-3.5" /> Novo tenant
              </button>
            </div>

            <p className="text-sm text-gray-400 mt-2 max-w-2xl">
              Cockpit operacional: campanhas, leads qualificados pela Joana, funil comercial e configuração de IA.
            </p>
            <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
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
        <div className="flex gap-1 mb-6 bg-slate-50 rounded-xl p-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                tab === id ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20" : "text-gray-400 hover:text-white hover:bg-slate-50"
              }`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "config-ia" ? (
          <TabConfigIA tenant={selectedTenant} />
        ) : isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState msg={`Erro ao carregar cockpit: ${(error as Error)?.message ?? "desconhecido"}`} />
        ) : cockpit ? (
          <>
            {tab === "visao-geral" && <TabVisaoGeral data={cockpit} />}
            {tab === "marketing"   && <TabMarketing data={cockpit} onRefresh={refresh} tenant={selectedTenant} />}
            {tab === "leads"       && <TabLeads data={cockpit} />}
            {tab === "funis"       && <TabFunis data={cockpit} />}
            {tab === "agentes"     && <TabAgentes data={cockpit} tenant={selectedTenant} />}
            {tab === "insights"    && <TabInsights data={cockpit} />}
          </>
        ) : null}

      </div>
    </div>
  );
}
