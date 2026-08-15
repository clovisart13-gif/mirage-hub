import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSearch } from "wouter";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Sparkles, ChevronRight, ChevronLeft, Building2, Target, Palette,
  Plus, Trash2, Check, X, RefreshCw, Loader2, ArrowLeft,
  Zap, ShoppingBag, Layers, Eye, ThumbsUp, ThumbsDown,
  AlertCircle, CheckCircle2, BarChart3, Edit3, Save,
  Rocket, Film, Globe, Clock,
  ImageIcon, Instagram, Send, Download, Copy, Heart, MessageSquare,
  Share2, Bookmark, MoreHorizontal, Upload, FolderOpen,
  Calendar, CalendarDays, ListFilter, Unlink,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLocation } from "wouter";

// ── Default blueprints ────────────────────────────────────────────────────────

const DEFAULT_BLUEPRINTS: Record<string, Omit<BrandBlueprint, "company_slug">> = {
  mirage: {
    nome_marca: "Mirage",
    segmento: "SaaS para confecção brasileira",
    descricao: "Plataforma operacional que digitaliza e organiza a produção têxtil brasileira.",
    proposito: "Organizar e profissionalizar a operação da confecção brasileira",
    promessa: "Dar clareza operacional e digitalização prática para confecções",
    diferencial: "Única plataforma construída por quem vive o chão de fábrica têxtil",
    publico_principal: "Confecções pequenas e médias em profissionalização",
    dores: ["perda de controle da produção", "custo invisível de retrabalho", "dependência de planilhas"],
    desejos: ["visibilidade total da operação", "redução de desperdício", "profissionalização do negócio"],
    tom_de_voz: "Próximo, direto, prático — sem jargão de TI",
    adjetivos: ["organizado", "prático", "confiável", "brasileiro"],
    estilo_visual: "Clean industrial — tons neutros com acento em roxo/índigo",
    referencias_esteticas: "Notion, Linear, monday.com — adaptado para o chão de fábrica",
    produto_principal: "Hub operacional para confecção",
    objetivo_atual: "Converter trials e validar aquisição",
    whatsapp: "",
    instagram: "@gestaomirage",
    cor_primaria: "#1e40af",
    logo_url: null,
  },
  r2pb: {
    nome_marca: "R2PB",
    segmento: "Private label premium",
    descricao: "Produção private label para marcas premium de moda, streetwear e fitness.",
    proposito: "Entregar produção premium que preserve e fortaleça a marca do cliente",
    promessa: "Produção private label premium com qualidade e previsibilidade",
    diferencial: "Capacidade industrial com sensibilidade de marca — não só fábrica, parceiro de produto",
    publico_principal: "Marcas premium de streetwear, fitness e alfaiataria",
    dores: ["fábricas que não entendem o posicionamento da marca", "baixa previsibilidade de entrega", "qualidade inconsistente"],
    desejos: ["parceiro que entende branding", "produção que eleva o produto", "processo transparente"],
    tom_de_voz: "Profissional, parceiro, orientado a detalhe — tom de quem entende moda",
    adjetivos: ["premium", "preciso", "parceiro", "confiável"],
    estilo_visual: "Elegante e técnico — preto, branco, detalhes em dourado ou grafite",
    referencias_esteticas: "Everlane (processo transparente), Cuyana (qualidade sem exagero)",
    produto_principal: "Produção private label premium",
    objetivo_atual: "Gerar leads qualificados de marcas premium",
    whatsapp: "(011) 99439-3480",
    instagram: "@r2pbfabricaderoupas",
    cor_primaria: "#2563eb",
    logo_url: null,
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface BrandBlueprint {
  id?: string;
  company_slug: string;
  nome_marca: string;
  segmento: string;
  descricao: string;
  proposito: string;
  promessa: string;
  diferencial: string;
  publico_principal: string;
  dores: string[];
  desejos: string[];
  tom_de_voz: string;
  adjetivos: string[];
  estilo_visual: string;
  referencias_esteticas: string;
  produto_principal: string;
  objetivo_atual: string;
  // identidade visual
  whatsapp?: string;
  instagram?: string;
  cor_primaria?: string;
  logo_url?: string | null;
}

interface Suficiency {
  score: number;
  level: "incompleto" | "suficiente" | "forte" | "pronto";
  missing?: string[];
}

interface ScheduleSlot {
  id: string;
  campaign_blueprint_id: string;
  creative_id: string | null;
  creative?: { headline: string | null; canal: string | null; status_aprovacao: string; asset_storage_path: string | null } | null;
  channel: string | null;
  scheduled_at: string;
  slot_order: number;
  stage_focus: string | null;
  status: "empty" | "scheduled" | "published" | "failed";
}

interface CampaignBlueprint {
  id: string;
  company_slug: string;
  nome: string;
  objetivo: string;
  produto_foco: string;
  promessa_central: string;
  problema_central: string;
  desejo_central: string;
  publico_principal: string;
  objecoes: string[];
  angulos: string[];
  pilares: string[];
  cta_principal: string;
  direcao_criativa: string;
  status: string;
  period_days?: number;
  start_date?: string | null;
  auto_schedule_enabled?: boolean;
  auto_publish_enabled?: boolean;
  default_slot_time?: string;
  suficiency: Suficiency;
  created_at: string;
}

interface MachineCreative {
  id: string;
  campaign_blueprint_id: string;
  modo_criativo: "conceitual" | "comercial" | "hibrido";
  canal: string;
  formato: string;
  objetivo_peca: string;
  headline: string;
  hook: string;
  legenda: string;
  cta: string;
  direcao_arte: string;
  prompt_visual: string;
  video_prompt?: string | null;
  proporcao: string;
  status_aprovacao: "generated" | "in_review" | "approved" | "rejected" | "in_production" | "published" | "pendente" | "aprovado" | "reprovado";
  brand_fit_score: string | null;
  campaign_fit_score: string | null;
  commercial_strength_score: string | null;
  visual_quality_score: string | null;
  asset_storage_path?: string | null;
  image_prompt_used?: string | null;
  branding_variant?: string | null;
  publication_id?: string | null;
  template_used?: string | null;
  funnel_stage?: string | null;
  created_at: string;
  updated_at?: string;
}

type MachineStep = "brand" | "campaigns" | "campaign-detail" | "creatives";

interface TenantAsset {
  id: string;
  companySlug: string;
  filename: string;
  storagePath: string;
  mimetype: string;
  sizeBytes: number;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function machineImgUrl(storagePath: string) {
  return `/api/storage${storagePath}`;
}

async function downloadBlobMachine(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch {
    toast.error("Erro ao baixar imagem");
  }
}

function SuficiencyBadge({ level, score }: { level: Suficiency["level"]; score: number }) {
  const cfg = {
    incompleto: { color: "bg-red-100 text-red-700 border-red-200", label: "Incompleto" },
    suficiente: { color: "bg-amber-100 text-amber-700 border-amber-200", label: "Suficiente" },
    forte:      { color: "bg-green-100 text-green-700 border-green-200", label: "Forte" },
    pronto:     { color: "bg-violet-100 text-violet-700 border-violet-200", label: "Pronto" },
  }[level];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
      {level === "forte" || level === "pronto" ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {cfg.label} · {score}%
    </span>
  );
}

function SuficiencyBar({ score, level }: { score: number; level: Suficiency["level"] }) {
  const color = level === "forte" || level === "pronto" ? "bg-green-500" : level === "suficiente" ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className={`${color} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${score}%` }} />
    </div>
  );
}

function ChipInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  function add() {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder={placeholder}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          className="h-8 text-sm" />
        <Button size="sm" variant="outline" onClick={add} className="h-8 px-2"><Plus className="w-3.5 h-3.5" /></Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-violet-50 border border-violet-200 text-violet-700 text-xs px-2 py-0.5 rounded-full">
              {v}
              <button onClick={() => onChange(values.filter((_, j) => j !== i))} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function AngulosInput({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const ensure5 = (arr: string[]) => {
    const r = [...arr];
    while (r.length < 5) r.push("");
    return r.slice(0, 5);
  };
  const arr = ensure5(values);
  return (
    <div className="space-y-2">
      {arr.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-4 shrink-0">#{i + 1}</span>
          <Input value={v} onChange={e => { const n = [...arr]; n[i] = e.target.value; onChange(n.filter(x => x.trim())); }}
            placeholder={`Ângulo ${i + 1}${i < 3 ? " (obrigatório)" : " (opcional)"}`} className="h-8 text-sm" />
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Brand Foundation ──────────────────────────────────────────────────

// ── Brand Identity Section (logo, whatsapp, instagram, cor_primaria) ──────────

function BrandIdentitySection({
  form, set, companySlug,
}: {
  form: BrandBlueprint;
  set: (k: keyof BrandBlueprint, v: unknown) => void;
  companySlug: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const b64 = await new Promise<string>((res, rej) => {
        reader.onload = () => res((reader.result as string).split(",")[1]!);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const resp = await apiFetch("/marketing/machine/brand/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_slug: companySlug,
          filename: file.name,
          data_base64: b64,
          mimetype: file.type || "image/png",
        }),
      });
      if (resp.ok) {
        set("logo_url", resp.logo_url);
        toast.success("Logo enviado com sucesso!");
      } else {
        toast.error("Erro ao enviar logo");
      }
    } catch {
      toast.error("Erro ao enviar logo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 p-5 space-y-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
        <Palette className="w-3.5 h-3.5" /> Identidade Visual
      </h3>

      {/* Logo */}
      <div>
        <label className="text-xs font-medium text-gray-600 mb-2 block">Logotipo da marca</label>
        <div className="flex items-center gap-3">
          {form.logo_url ? (
            <div className="relative w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
              <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center shrink-0">
              <span className="text-2xl text-gray-300">🏷️</span>
            </div>
          )}
          <div className="flex-1">
            <label className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${uploading ? "border-gray-200 text-gray-400 bg-gray-50" : "border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100"}`}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {uploading ? "Enviando…" : "Enviar logo"}
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoFile} disabled={uploading} />
            </label>
            <p className="text-[11px] text-gray-400 mt-1.5">PNG ou SVG com fundo transparente. Aparece nas imagens geradas pela IA.</p>
            {form.logo_url && (
              <button
                className="mt-1 text-[11px] text-red-500 hover:underline"
                onClick={() => set("logo_url", null)}
              >
                Remover logo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cor primária */}
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Cor primária da marca</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={form.cor_primaria ?? "#2563eb"}
            onChange={e => set("cor_primaria", e.target.value)}
            className="h-9 w-14 rounded border border-gray-300 cursor-pointer p-0.5"
          />
          <Input
            value={form.cor_primaria ?? "#2563eb"}
            onChange={e => set("cor_primaria", e.target.value)}
            placeholder="#2563eb"
            className="h-9 w-32 font-mono text-sm"
            maxLength={7}
          />
          <div
            className="h-9 w-9 rounded border border-gray-200 shrink-0"
            style={{ backgroundColor: form.cor_primaria ?? "#2563eb" }}
          />
        </div>
      </div>

      {/* WhatsApp & Instagram */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">WhatsApp para contato</label>
          <Input
            value={form.whatsapp ?? ""}
            onChange={e => set("whatsapp", e.target.value)}
            placeholder="(11) 99999-9999"
            className="h-9"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Instagram</label>
          <Input
            value={form.instagram ?? ""}
            onChange={e => set("instagram", e.target.value)}
            placeholder="@suamarca"
            className="h-9"
          />
        </div>
      </div>
      <p className="text-[11px] text-gray-400">Estas informações aparecem no rodapé das imagens geradas pela IA.</p>
    </section>
  );
}

// ── Brand Foundation Step ─────────────────────────────────────────────────────

function BrandFoundationStep({
  companySlug, onNext,
}: { companySlug: string; onNext: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ ok: boolean; brand: BrandBlueprint | null; suficiency: Suficiency }>({
    queryKey: ["machine-brand", companySlug],
    queryFn: () => apiFetch(`/marketing/machine/brand?company_slug=${companySlug}`),
    enabled: !!companySlug,
  });

  const empty: BrandBlueprint = {
    company_slug: companySlug, nome_marca: "", segmento: "", descricao: "", proposito: "",
    promessa: "", diferencial: "", publico_principal: "", dores: [], desejos: [],
    tom_de_voz: "", adjetivos: [], estilo_visual: "", referencias_esteticas: "",
    produto_principal: "", objetivo_atual: "",
  };
  const [form, setForm] = useState<BrandBlueprint | null>(null);
  const [imported, setImported] = useState<string | null>(null);
  const currentForm = form ?? (data?.brand ?? empty);

  function importBlueprint(slug: string) {
    const bp = DEFAULT_BLUEPRINTS[slug];
    if (!bp) return;
    setForm({ ...bp, company_slug: companySlug });
    setImported(slug);
    toast.success(`Blueprint ${bp.nome_marca} importado — revise e salve.`);
  }

  const mut = useMutation({
    mutationFn: (payload: BrandBlueprint) => apiFetch("/marketing/machine/brand", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, company_slug: companySlug }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["machine-brand", companySlug] });
      toast.success("Brand Blueprint salvo!");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  function set(k: keyof BrandBlueprint, v: unknown) {
    setForm(prev => ({ ...(prev ?? currentForm), [k]: v }));
  }

  // Suficiência calculada localmente a partir do currentForm (não espera save para habilitar o botão)
  function calcLocalSuficiency(b: BrandBlueprint): { score: number; level: "incompleto" | "suficiente" | "forte" } {
    const required = ["nome_marca","segmento","proposito","promessa","diferencial","publico_principal","tom_de_voz","produto_principal","objetivo_atual"] as const;
    let filled = required.filter(k => {
      const v = b[k];
      return v !== null && v !== undefined && String(v).trim() !== "";
    }).length;
    if (b.adjetivos && b.adjetivos.length >= 3) filled++;
    const total = required.length + 1;
    const pct = filled / total;
    return { score: Math.round(pct * 100), level: pct >= 0.85 ? "forte" : pct >= 0.6 ? "suficiente" : "incompleto" };
  }

  const serverSuficiency = data?.suficiency ?? { score: 0, level: "incompleto" as const };
  // Se o usuário editou o form localmente, usa suficiência local; caso contrário usa a do servidor
  const suficiency = form !== null ? calcLocalSuficiency(currentForm) : serverSuficiency;
  const canProceed = suficiency.level !== "incompleto";

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Brand Foundation</h2>
          <p className="text-sm text-gray-500 mt-0.5">Define a identidade, essência e posicionamento da marca antes de criar campanhas.</p>
        </div>
        <div className="shrink-0 text-right">
          <SuficiencyBadge level={suficiency.level} score={suficiency.score} />
          <SuficiencyBar score={suficiency.score} level={suficiency.level} />
        </div>
      </div>

      {/* Importar blueprint padrão — só aparece se houver um blueprint padrão para este tenant */}
      {DEFAULT_BLUEPRINTS[companySlug] && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-xs font-semibold text-violet-700 mb-2.5">Importar blueprint padrão</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className={`gap-1.5 text-xs border-violet-300 text-violet-700 hover:bg-violet-100 ${imported === companySlug ? "bg-violet-100 font-semibold" : ""}`}
              onClick={() => importBlueprint(companySlug)}
            >
              {imported === companySlug ? <Check className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
              {DEFAULT_BLUEPRINTS[companySlug].nome_marca}
            </Button>
          </div>
          <p className="text-[11px] text-violet-500 mt-2">Preenche o formulário com os dados padrão — você pode editar antes de salvar.</p>
        </div>
      )}

      <div className="grid gap-8">
        {/* Identidade */}
        <section className="rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Identidade
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Nome da marca *</label>
              <Input value={currentForm.nome_marca} onChange={e => set("nome_marca", e.target.value)} placeholder="ex: Confecção Estrela" className="h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Segmento *</label>
              <Input value={currentForm.segmento} onChange={e => set("segmento", e.target.value)} placeholder="ex: Moda feminina plus size" className="h-9" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Descrição curta</label>
            <Textarea value={currentForm.descricao} onChange={e => set("descricao", e.target.value)} placeholder="O que a marca faz em 1-2 frases" rows={2} className="text-sm resize-none" />
          </div>
        </section>

        {/* Essência */}
        <section className="rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Essência
          </h3>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Propósito *</label>
            <Textarea value={currentForm.proposito} onChange={e => set("proposito", e.target.value)} placeholder="Por que essa marca existe além de vender?" rows={2} className="text-sm resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Promessa principal *</label>
            <Input value={currentForm.promessa} onChange={e => set("promessa", e.target.value)} placeholder="O que a marca promete entregar ao cliente?" className="h-9" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Diferencial central *</label>
            <Input value={currentForm.diferencial} onChange={e => set("diferencial", e.target.value)} placeholder="O que nenhum concorrente tem?" className="h-9" />
          </div>
        </section>

        {/* Público */}
        <section className="rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> Público
          </h3>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Público-alvo principal *</label>
            <Input value={currentForm.publico_principal} onChange={e => set("publico_principal", e.target.value)} placeholder="ex: Mulheres 30-45, empreendedoras, Sul e Sudeste" className="h-9" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Dores</label>
              <ChipInput values={currentForm.dores} onChange={v => set("dores", v)} placeholder="Adicionar dor + Enter" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Desejos</label>
              <ChipInput values={currentForm.desejos} onChange={v => set("desejos", v)} placeholder="Adicionar desejo + Enter" />
            </div>
          </div>
        </section>

        {/* Voz */}
        <section className="rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5" /> Voz da marca
          </h3>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Tom de voz *</label>
            <Input value={currentForm.tom_de_voz} onChange={e => set("tom_de_voz", e.target.value)} placeholder="ex: Próximo, direto, inspirador, sem jargões" className="h-9" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">3 adjetivos da marca * <span className="text-gray-400 font-normal">(mínimo 3)</span></label>
            <ChipInput values={currentForm.adjetivos} onChange={v => set("adjetivos", v)} placeholder="Adjetivo + Enter" />
          </div>
        </section>

        {/* Visual */}
        <section className="rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" /> Visual
          </h3>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Estilo visual</label>
            <Input value={currentForm.estilo_visual} onChange={e => set("estilo_visual", e.target.value)} placeholder="ex: Clean, tons neutros, tipografia sans-serif bold" className="h-9" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Referências estéticas</label>
            <Textarea value={currentForm.referencias_esteticas} onChange={e => set("referencias_esteticas", e.target.value)} placeholder="Marcas, estilos ou campanhas de referência" rows={2} className="text-sm resize-none" />
          </div>
        </section>

        {/* Produto & Contexto */}
        <section className="rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" /> Produto & Contexto
          </h3>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Produto principal *</label>
            <Input value={currentForm.produto_principal} onChange={e => set("produto_principal", e.target.value)} placeholder="ex: Linha Primavera — coleção de vestidos midi" className="h-9" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Objetivo atual da marca *</label>
            <Textarea value={currentForm.objetivo_atual} onChange={e => set("objetivo_atual", e.target.value)} placeholder="ex: Aumentar reconhecimento no Instagram e converter seguidores em compradores B2B" rows={2} className="text-sm resize-none" />
          </div>
        </section>

        {/* Identidade Visual */}
        <BrandIdentitySection form={currentForm} set={set} companySlug={companySlug} />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="text-sm text-gray-400">
          {suficiency.level === "incompleto" && "Preencha mais campos para avançar"}
          {suficiency.level === "suficiente" && "Brand suficiente — você pode avançar ou fortalecer mais"}
          {suficiency.level === "forte" && "Brand forte! Pronto para criar campanhas."}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => mut.mutate(currentForm)} disabled={mut.isPending} className="gap-1.5">
            {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
          <Button
            onClick={async () => {
              try {
                await mut.mutateAsync(currentForm);
                onNext();
              } catch {
                toast.error("Falha ao salvar Brand Foundation. Verifique sua conexão e tente novamente.");
              }
            }}
            disabled={!canProceed || mut.isPending}
            className="gap-1.5 bg-violet-600 hover:bg-violet-700"
          >
            {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            Avançar — Campanhas
          </Button>
        </div>
      </div>

      {!canProceed && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Preencha pelo menos os campos obrigatórios (*) para habilitar a criação de campanhas. O sistema precisa de uma base de marca sólida antes de gerar estratégia.</p>
        </div>
      )}
    </div>
  );
}

// ── Step 2: Campaign Strategy ─────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function CampaignForm({
  companySlug,
  campaign,
  onSave,
  onCancel,
  brandSuficiency,
}: {
  companySlug: string;
  campaign?: CampaignBlueprint;
  onSave: (c: CampaignBlueprint) => void;
  onCancel: () => void;
  brandSuficiency: Suficiency;
}) {
  const [form, setForm] = useState({
    nome: campaign?.nome ?? "",
    objetivo: campaign?.objetivo ?? "",
    produto_foco: campaign?.produto_foco ?? "",
    promessa_central: campaign?.promessa_central ?? "",
    problema_central: campaign?.problema_central ?? "",
    desejo_central: campaign?.desejo_central ?? "",
    publico_principal: campaign?.publico_principal ?? "",
    objecoes: campaign?.objecoes ?? [],
    angulos: campaign?.angulos ?? [],
    pilares: campaign?.pilares ?? [],
    cta_principal: campaign?.cta_principal ?? "",
    direcao_criativa: campaign?.direcao_criativa ?? "",
    // scheduling
    period_days: campaign?.period_days ?? 30,
    start_date: campaign?.start_date ?? todayIso(),
    auto_schedule_enabled: campaign?.auto_schedule_enabled ?? true,
    default_slot_time: campaign?.default_slot_time ?? "09:00",
  });
  function set(k: string, v: unknown) { setForm(prev => ({ ...prev, [k]: v })); }

  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company_slug: companySlug };
      if (campaign?.id) {
        return apiFetch(`/marketing/machine/campaigns-bp/${campaign.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      return apiFetch("/marketing/machine/campaigns-bp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["machine-campaigns", companySlug] });
      toast.success(campaign ? "Campanha atualizada!" : "Campanha criada!");
      onSave(data.campaign);
    },
    onError: () => toast.error("Erro ao salvar campanha"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1 text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <h2 className="text-base font-bold text-gray-900">{campaign ? "Editar campanha" : "Nova campanha"}</h2>
      </div>

      {brandSuficiency.level === "incompleto" && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Brand Blueprint insuficiente. Volte ao passo anterior e fortaleça a base da marca antes de criar campanhas.</p>
        </div>
      )}

      <div className="grid gap-6">
        <section className="rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Base da campanha</h3>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Nome da campanha *</label>
            <Input value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="ex: Lançamento Coleção Inverno 2025" className="h-9" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Objetivo principal *</label>
              <Input value={form.objetivo} onChange={e => set("objetivo", e.target.value)} placeholder="ex: Gerar 50 pedidos B2B em 30 dias" className="h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Produto / oferta foco *</label>
              <Input value={form.produto_foco} onChange={e => set("produto_foco", e.target.value)} placeholder="ex: Linha Inverno — mínimo 10 peças" className="h-9" />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Direção estratégica</h3>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Promessa central *</label>
            <Input value={form.promessa_central} onChange={e => set("promessa_central", e.target.value)} placeholder="O que o cliente vai ganhar com isso?" className="h-9" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Problema central</label>
              <Input value={form.problema_central} onChange={e => set("problema_central", e.target.value)} placeholder="Qual dor essa campanha resolve?" className="h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Desejo central</label>
              <Input value={form.desejo_central} onChange={e => set("desejo_central", e.target.value)} placeholder="Qual desejo essa campanha atende?" className="h-9" />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Público da campanha</h3>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Público principal *</label>
            <Input value={form.publico_principal} onChange={e => set("publico_principal", e.target.value)} placeholder="Quem deve ver essa campanha?" className="h-9" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Objeções prioritárias</label>
            <ChipInput values={form.objecoes} onChange={v => set("objecoes", v)} placeholder="Objeção + Enter" />
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ângulos de comunicação <span className="text-red-400">*</span> <span className="font-normal normal-case text-gray-400">(mínimo 3)</span></h3>
          <AngulosInput values={form.angulos} onChange={v => set("angulos", v)} />
        </section>

        <section className="rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pilares de conteúdo</h3>
          <ChipInput values={form.pilares} onChange={v => set("pilares", v)} placeholder="Pilar + Enter (ex: Educação, Prova social, Bastidores)" />
        </section>

        <section className="rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Oferta & Direção criativa</h3>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">CTA principal *</label>
            <Input value={form.cta_principal} onChange={e => set("cta_principal", e.target.value)} placeholder="ex: Faça seu pedido pelo link na bio" className="h-9" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Direção criativa mínima</label>
            <Textarea value={form.direcao_criativa} onChange={e => set("direcao_criativa", e.target.value)} placeholder="Referências visuais, tom, o que deve aparecer, o que evitar..." rows={3} className="text-sm resize-none" />
          </div>
        </section>

        <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Calendário editorial</h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Duração da campanha</label>
              <Select value={String(form.period_days)} onValueChange={v => set("period_days", parseInt(v, 10))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="15">15 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Data de início</label>
              <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Horário padrão (BRT)</label>
              <Input type="time" value={form.default_slot_time} onChange={e => set("default_slot_time", e.target.value)} className="h-9" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.auto_schedule_enabled}
              onChange={e => set("auto_schedule_enabled", e.target.checked)}
              className="rounded border-gray-300 text-indigo-600" />
            <span className="text-xs text-gray-700">Alocar criativos aprovados automaticamente nos slots do calendário</span>
          </label>
          <p className="text-[11px] text-indigo-500">
            {form.period_days} slot{form.period_days !== 1 ? "s" : ""} serão criados — 1 por dia a partir de {form.start_date || "hoje"} às {form.default_slot_time} (BRT)
          </p>
        </section>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending || !form.nome.trim()} className="gap-1.5 bg-violet-600 hover:bg-violet-700">
          {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar campanha
        </Button>
      </div>
    </div>
  );
}

function CampaignsStep({
  companySlug,
  brandSuficiency,
  onCreatives,
  onBack,
}: {
  companySlug: string;
  brandSuficiency: Suficiency;
  onCreatives: (campaign: CampaignBlueprint) => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<"list" | "new" | "edit">("list");
  const [editing, setEditing] = useState<CampaignBlueprint | undefined>();
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPeriod, setAiPeriod] = useState<7 | 15 | 30>(30);
  const [aiChannel, setAiChannel] = useState("Instagram");
  const [aiGoal, setAiGoal] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const qc = useQueryClient();

  const handleGenerateWithAI = async () => {
    setAiGenerating(true);
    setAiSummary(null);
    try {
      const result = await apiFetch("/marketing/machine/generate-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_slug: companySlug, period_days: aiPeriod, primary_channel: aiChannel, business_goal: aiGoal }),
      });
      qc.invalidateQueries({ queryKey: ["machine-campaigns", companySlug] });
      setAiSummary(result.executive_summary ?? null);
      toast.success(`Campanha "${result.campaign?.nome}" gerada com sucesso!`);
      setShowAiPanel(false);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao gerar campanha com IA");
    } finally {
      setAiGenerating(false);
    }
  };

  const { data, isLoading } = useQuery<{ ok: boolean; campaigns: CampaignBlueprint[] }>({
    queryKey: ["machine-campaigns", companySlug],
    queryFn: () => apiFetch(`/marketing/machine/campaigns-bp?company_slug=${companySlug}`),
    enabled: !!companySlug,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/marketing/machine/campaigns-bp/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["machine-campaigns", companySlug] }); toast.success("Campanha excluída"); },
  });

  if (mode === "new" || mode === "edit") {
    return <CampaignForm companySlug={companySlug} campaign={editing} brandSuficiency={brandSuficiency}
      onSave={() => setMode("list")} onCancel={() => setMode("list")} />;
  }

  const campaigns = data?.campaigns ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Campaign Strategy</h2>
          <p className="text-sm text-gray-500 mt-0.5">Transforme o brand em estratégia de campanha antes de gerar criativos.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            onClick={() => setShowAiPanel(v => !v)}
            disabled={brandSuficiency.level === "incompleto"}
            variant="outline"
            className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50"
          >
            <Sparkles className="w-4 h-4" /> Gerar com IA
          </Button>
          <Button onClick={() => { setEditing(undefined); setMode("new"); }} disabled={brandSuficiency.level === "incompleto"} className="gap-1.5 bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4" /> Manual
          </Button>
        </div>
      </div>

      {/* Painel de geração com IA */}
      {showAiPanel && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600" />
            <p className="text-sm font-semibold text-violet-800">Gerar plano estratégico com IA</p>
            <p className="text-xs text-violet-500 ml-auto">GPT-4o via ATHOS</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-violet-700 mb-1 block">Período</label>
              <Select value={String(aiPeriod)} onValueChange={v => setAiPeriod(Number(v) as 7 | 15 | 30)}>
                <SelectTrigger className="h-9 bg-white border-violet-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias — Sprint semanal</SelectItem>
                  <SelectItem value="15">15 dias — Quinzenal</SelectItem>
                  <SelectItem value="30">30 dias — Mensal completo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-violet-700 mb-1 block">Canal principal</label>
              <Select value={aiChannel} onValueChange={setAiChannel}>
                <SelectTrigger className="h-9 bg-white border-violet-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Instagram", "WhatsApp", "LinkedIn", "TikTok", "E-mail", "Site"].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-violet-700 mb-1 block">Objetivo de negócio <span className="font-normal text-violet-400">(opcional)</span></label>
              <Input
                value={aiGoal}
                onChange={e => setAiGoal(e.target.value)}
                placeholder="ex: gerar 30 leads B2B"
                className="h-9 bg-white border-violet-200 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleGenerateWithAI}
              disabled={aiGenerating}
              className="gap-1.5 bg-violet-600 hover:bg-violet-700"
            >
              {aiGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando plano...</> : <><Sparkles className="w-4 h-4" /> Gerar campanha</>}
            </Button>
            <Button variant="outline" onClick={() => setShowAiPanel(false)} disabled={aiGenerating}>
              Cancelar
            </Button>
          </div>
          {aiGenerating && (
            <p className="text-xs text-violet-500 animate-pulse">Consultando GPT-4o — pode levar até 30 segundos...</p>
          )}
        </div>
      )}

      {brandSuficiency.level === "incompleto" && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>O Brand Blueprint está incompleto. <button onClick={onBack} className="underline font-medium">Volte ao Brand Foundation</button> e preencha os campos obrigatórios antes de criar campanhas.</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center text-gray-400">
          <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhuma campanha ainda</p>
          <p className="text-xs mt-1">Crie a primeira estratégia de campanha acima</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {campaigns.map(c => (
            <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4 flex items-start gap-4 hover:border-violet-200 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm">{c.nome}</p>
                  <SuficiencyBadge level={c.suficiency.level} score={c.suficiency.score} />
                </div>
                {c.objetivo && <p className="text-xs text-gray-500 mt-0.5 truncate">{c.objetivo}</p>}
                {c.angulos?.filter(a => a.trim()).length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {c.angulos.filter(a => a.trim()).slice(0, 3).map((a, i) => (
                      <span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{a}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {c.suficiency.level === "incompleto" ? (
                  <div className="relative group/tip">
                    <Button size="sm" disabled
                      className="h-8 gap-1.5 px-3 text-xs bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200">
                      <Zap className="w-3.5 h-3.5" /> Criativos
                    </Button>
                    {c.suficiency.missing && c.suficiency.missing.length > 0 && (
                      <div className="absolute right-0 top-full mt-1 z-20 hidden group-hover/tip:block w-52 rounded-lg border border-amber-200 bg-amber-50 p-2.5 shadow-lg">
                        <p className="text-[11px] font-semibold text-amber-800 mb-1">Faltam para avançar:</p>
                        <ul className="space-y-0.5">
                          {c.suficiency.missing.map(m => (
                            <li key={m} className="text-[11px] text-amber-700 flex items-center gap-1">
                              <X className="w-3 h-3 shrink-0" /> {m}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button size="sm" onClick={() => onCreatives(c)}
                    className="h-8 gap-1.5 px-3 text-xs bg-violet-600 hover:bg-violet-700 text-white">
                    <Zap className="w-3.5 h-3.5" /> Criativos
                  </Button>
                )}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setMode("edit"); }} className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700">
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => delMut.mutate(c.id)} className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-start pt-2 border-t border-gray-100">
        <Button variant="outline" onClick={onBack} className="gap-1.5">
          <ChevronLeft className="w-4 h-4" /> Brand Foundation
        </Button>
      </div>
    </div>
  );
}

// ── Machine Instagram Preview Modal ──────────────────────────────────────────

function parseStorySequence(legenda: string): string[] {
  if (!legenda) return [];
  const matches = [...legenda.matchAll(/\d+[ºo°]\s*Story:\s*[''"«]([^''""»]+)[''"»]/gi)];
  if (matches.length > 1) return matches.map(m => m[1].trim());
  return [legenda];
}

function MachineInstagramPreviewModal({
  creative, companySlug, onClose,
}: {
  creative: MachineCreative;
  companySlug: string;
  onClose: () => void;
}) {
  const isStory = /story|stories/i.test(creative.canal || "") || /story|stories/i.test(creative.formato || "");
  const storyScripts = isStory ? parseStorySequence(creative.legenda) : [];
  const isSequence = storyScripts.length > 1;
  const [activeStory, setActiveStory] = useState(0);

  const storagePath = creative.asset_storage_path!;
  const imageFullUrl = `${window.location.origin}${machineImgUrl(storagePath)}`;
  const filename = `criativo-${creative.id.slice(0, 8)}.png`;

  const feedCaption = [creative.headline, creative.legenda || creative.hook]
    .filter(Boolean).join("\n\n");
  const currentStoryText = isSequence
    ? storyScripts[activeStory]
    : (creative.legenda || creative.hook || "");

  function copyCaption() {
    const text = isStory ? (creative.legenda || "") : feedCaption;
    navigator.clipboard.writeText(text)
      .then(() => toast.success("Legenda copiada!"))
      .catch(() => toast.error("Erro ao copiar"));
  }

  const [showSafeZone, setShowSafeZone] = useState(true);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-2xl bg-black">
        {/* Barra de ações superior */}
        <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-100">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            Prévia — {isStory ? "Stories 9:16" : creative.formato || "Feed 1:1"}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSafeZone(v => !v)}
              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${showSafeZone ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-gray-50 border-gray-200 text-gray-400"}`}
            >
              {showSafeZone ? "⚠ Zonas visíveis" : "Zonas ocultas"}
            </button>
          </div>
        </div>

        {/* Simulação do celular */}
        <div className="bg-black flex justify-center py-2 px-4">
          <div className={`relative w-full overflow-hidden rounded-xl bg-gray-900 ${isStory ? "aspect-[9/16] max-h-[480px]" : "aspect-square"}`}>
            {/* Imagem */}
            <img
              src={imageFullUrl}
              alt="Criativo"
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />

            {/* ── SAFE ZONES overlay ── */}
            {showSafeZone && (
              <>
                {/* Zona topo (perfil + barra de progresso) — ~15% */}
                <div className="absolute top-0 left-0 right-0 h-[15%] bg-black/40 border-b-2 border-amber-400/60 flex items-end px-2 pb-1 z-20">
                  <span className="text-[9px] text-amber-300 font-semibold">⚠ Zona do perfil Instagram</span>
                </div>
                {/* Zona base (CTA / resposta) — ~12% */}
                <div className="absolute bottom-0 left-0 right-0 h-[12%] bg-black/40 border-t-2 border-amber-400/60 flex items-start px-2 pt-1 z-20">
                  <span className="text-[9px] text-amber-300 font-semibold">⚠ Zona de botões / CTA</span>
                </div>
              </>
            )}

            {/* ── UI Instagram Stories (simulação) ── */}
            {isStory && (
              <>
                {/* Barra de progresso */}
                <div className="absolute top-3 left-3 right-3 flex gap-1 z-30">
                  {(isSequence ? storyScripts : [""]).map((_, i) => (
                    <div key={i} className={`h-0.5 flex-1 rounded-full ${i === activeStory ? "bg-white" : i < activeStory ? "bg-white/80" : "bg-white/30"}`} />
                  ))}
                </div>
                {/* Header perfil */}
                <div className="absolute top-6 left-3 right-3 flex items-center gap-2 z-30">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 border-2 border-white flex items-center justify-center shrink-0">
                    <Instagram className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-white text-[11px] font-semibold leading-none drop-shadow">@{companySlug}</p>
                    <p className="text-white/70 text-[9px]">agora</p>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-white ml-auto drop-shadow" />
                </div>
                {/* Botões laterais */}
                <div className="absolute right-3 bottom-[14%] flex flex-col gap-4 items-center z-30">
                  <div className="flex flex-col items-center gap-0.5">
                    <Heart className="w-6 h-6 text-white drop-shadow" />
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <MessageSquare className="w-6 h-6 text-white drop-shadow" />
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Send className="w-6 h-6 text-white drop-shadow rotate-[-30deg]" />
                  </div>
                </div>
                {/* Área de resposta */}
                <div className="absolute bottom-3 left-3 right-3 z-30">
                  <div className="border border-white/50 rounded-full px-3 py-1.5 flex items-center justify-between">
                    <span className="text-white/70 text-[10px]">Enviar mensagem...</span>
                    <Send className="w-3.5 h-3.5 text-white/70" />
                  </div>
                </div>
                {/* Navegação */}
                {isSequence && (
                  <>
                    <button className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-black/40 text-white disabled:opacity-20 z-30"
                      onClick={() => setActiveStory(s => Math.max(0, s - 1))} disabled={activeStory === 0}>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-black/40 text-white disabled:opacity-20 z-30"
                      onClick={() => setActiveStory(s => Math.min(storyScripts.length - 1, s + 1))} disabled={activeStory === storyScripts.length - 1}>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </>
            )}

            {/* ── UI Instagram Feed (simulação) ── */}
            {!isStory && (
              <>
                {/* Header do post */}
                <div className="absolute top-0 left-0 right-0 flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-black/40 to-transparent z-30">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 border-2 border-white flex items-center justify-center shrink-0">
                    <Instagram className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-[11px] font-semibold leading-none drop-shadow">@{companySlug}</p>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-white drop-shadow" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Legenda e ações (feed) */}
        {!isStory && (
          <div className="bg-white px-3 py-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-gray-700" />
                <MessageSquare className="w-5 h-5 text-gray-700" />
                <Send className="w-5 h-5 text-gray-700 rotate-[-30deg]" />
              </div>
              <Bookmark className="w-5 h-5 text-gray-700" />
            </div>
            <p className="text-[12px] text-gray-800 leading-relaxed line-clamp-3">
              <span className="font-semibold">@{companySlug}</span>{" "}
              {feedCaption || <span className="text-gray-400 italic">Sem legenda</span>}
            </p>
            {creative.cta && <p className="text-[11px] font-semibold text-violet-600">{creative.cta}</p>}
          </div>
        )}

        {/* Script do story */}
        {isStory && (
          <div className="bg-white px-3 py-2.5 space-y-1.5">
            <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">
              {isSequence ? `Script do story ${activeStory + 1}/${storyScripts.length}` : "Script do story"}
            </p>
            <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-4">
              {currentStoryText || <span className="text-gray-400 italic">Sem texto</span>}
            </p>
            {isSequence && (
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                ⚠ Sequência de {storyScripts.length} stories — use as setas na prévia
              </p>
            )}
          </div>
        )}

        {/* Botões de ação */}
        <div className="bg-white border-t border-gray-100 px-3 py-2.5 flex gap-2">
          <button
            className="flex-1 h-8 text-xs gap-1.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md flex items-center justify-center"
            onClick={copyCaption}
          >
            <Copy className="w-3 h-3" /> Copiar legenda
          </button>
          <button
            className="flex-1 h-8 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-md flex items-center justify-center"
            onClick={() => downloadBlobMachine(imageFullUrl, filename)}
          >
            <Download className="w-3 h-3" /> Baixar imagem
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Machine Publish Modal ─────────────────────────────────────────────────────

function MachinePublishModal({
  creative, companySlug, onClose, onConfirm, loading,
}: {
  creative: MachineCreative;
  companySlug: string;
  onClose: () => void;
  onConfirm: (data: { publishMode: "immediate" | "scheduled"; scheduledAt: string | null; captionOverride?: string }) => void;
  loading: boolean;
}) {
  const [publishMode, setPublishMode] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledAt, setScheduledAt] = useState("");
  const [caption, setCaption] = useState(creative.legenda || creative.hook || "");

  const { data: igAccount, isLoading: isLoadingIg, error: igError } = useQuery<{
    account_id: string; username: string | null; name: string | null; company_slug: string;
  }>({
    queryKey: ["instagram-account", companySlug],
    queryFn: () => apiFetch(`/marketing/instagram-account?company_slug=${encodeURIComponent(companySlug)}`),
    enabled: !!companySlug,
    staleTime: 60_000,
    retry: false,
  });

  const igNotConfigured = !isLoadingIg && (igError || !igAccount);
  const canSubmit = !igNotConfigured && caption.trim() &&
    (publishMode === "immediate" || scheduledAt.trim());

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-500" />
            Publicar no Instagram
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {creative.asset_storage_path && (
            <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 pt-1.5">Imagem que será publicada</p>
              <img
                src={`${machineImgUrl(creative.asset_storage_path)}`}
                alt="Criativo"
                className="w-full max-h-36 object-contain p-2"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Conta Instagram</label>
            {isLoadingIg && (
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Buscando conta vinculada...
              </div>
            )}
            {igNotConfigured && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-700 space-y-1">
                <p className="font-semibold">Conta Instagram não configurada para "{companySlug}"</p>
                <p className="text-xs text-amber-600">Configure <code className="bg-amber-100 px-1 rounded">instagram_account_id_{companySlug}</code> em Mentor → Configurações.</p>
              </div>
            )}
            {igAccount && (
              <div className="flex items-center gap-3 rounded-xl border border-pink-300 bg-pink-50 px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
                  <Instagram className="w-4 h-4 text-pink-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{igAccount.name ?? companySlug}</p>
                  {igAccount.username && <p className="text-[11px] text-gray-500">@{igAccount.username}</p>}
                </div>
                <CheckCircle2 className="w-4 h-4 text-pink-500 shrink-0" />
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Legenda</label>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              placeholder="Legenda do post..."
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Modo de publicação</label>
            <div className="flex gap-2">
              {(["immediate", "scheduled"] as const).map(m => (
                <button key={m} type="button" onClick={() => setPublishMode(m)}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors ${publishMode === m ? "border-violet-400 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  {m === "immediate" ? "Publicar agora" : "Agendar"}
                </button>
              ))}
            </div>
          </div>
          {publishMode === "scheduled" && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                Data e hora <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 mt-2">
          <button onClick={onClose} disabled={loading}
            className="px-4 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button
            className="px-4 py-2 text-sm bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-md hover:from-pink-600 hover:to-purple-700 gap-2 flex items-center disabled:opacity-50"
            disabled={loading || !canSubmit}
            onClick={() => onConfirm({
              publishMode,
              scheduledAt: publishMode === "scheduled" ? new Date(scheduledAt).toISOString() : null,
              captionOverride: caption.trim(),
            })}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Send className="w-4 h-4" />
            {publishMode === "immediate" ? "Publicar agora" : "Agendar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Machine Library Picker Modal ─────────────────────────────────────────────

function MachineLibraryPickerModal({
  companySlug, onSelect, onClose,
}: {
  companySlug: string;
  onSelect: (asset: TenantAsset) => void;
  onClose: () => void;
}) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ ok: boolean; assets: TenantAsset[] }>({
    queryKey: ["tenant-library", companySlug],
    queryFn: () => apiFetch(`/marketing/library?company_slug=${encodeURIComponent(companySlug)}`),
    enabled: !!companySlug,
    staleTime: 30_000,
  });

  const assets = data?.assets ?? [];

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        await apiFetch("/marketing/library/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_slug: companySlug,
            filename: file.name,
            data_base64: base64,
            mimetype: file.type || "image/jpeg",
          }),
        });
        qc.invalidateQueries({ queryKey: ["tenant-library", companySlug] });
        toast.success("Imagem adicionada à biblioteca!");
      };
      reader.onerror = () => toast.error("Erro ao ler arquivo");
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error(`Erro no upload: ${err.message}`);
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover imagem da biblioteca?")) return;
    try {
      await apiFetch(`/marketing/library/${id}`, { method: "DELETE" });
      qc.invalidateQueries({ queryKey: ["tenant-library", companySlug] });
      toast.success("Removida da biblioteca");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="w-4 h-4 text-violet-500" /> Biblioteca de imagens
          </DialogTitle>
          <p className="text-xs text-gray-400 mt-0.5">
            Selecione uma imagem externa para usar como criativo, ou faça upload de uma nova.
          </p>
        </DialogHeader>

        {/* Upload zone */}
        <div className="px-5 py-3 border-b border-gray-100 shrink-0">
          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => uploadRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-violet-200 hover:border-violet-400 rounded-xl py-4 flex flex-col items-center gap-1.5 text-violet-500 hover:bg-violet-50 transition-colors disabled:opacity-50"
          >
            {uploading
              ? <><Loader2 className="w-5 h-5 animate-spin" /><span className="text-xs font-medium">Enviando...</span></>
              : <><Upload className="w-5 h-5" /><span className="text-xs font-medium">Clique para fazer upload de imagem</span><span className="text-[10px] text-gray-400">PNG, JPG, WebP — máx 10MB</span></>
            }
          </button>
        </div>

        {/* Gallery grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /><span className="text-sm">Carregando...</span>
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 space-y-1">
              <ImageIcon className="w-8 h-8 text-gray-300" />
              <p className="text-sm">Nenhuma imagem na biblioteca</p>
              <p className="text-xs">Faça upload acima para começar</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {assets.map(asset => (
                <div
                  key={asset.id}
                  className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer hover:border-violet-400 hover:ring-2 hover:ring-violet-200 transition-all aspect-square"
                  onClick={() => onSelect(asset)}
                >
                  <img
                    src={`/api/storage${asset.storagePath}`}
                    alt={asset.filename}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="bg-violet-600 text-white text-[10px] font-semibold px-2 py-1 rounded-full">Usar esta</span>
                  </div>
                  <button
                    className="absolute top-1 right-1 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-400 hover:text-red-600 transition-all z-10"
                    onClick={e => { e.stopPropagation(); handleDelete(asset.id); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[9px] text-white truncate">{asset.filename}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="w-full h-9 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
            Cancelar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── ScheduleView component ────────────────────────────────────────────────────

const STAGE_LABEL: Record<string, string> = {
  autoridade:   "Autoridade",
  prova_social: "Prova social",
  "consideração": "Consideração",
  conversão:    "Conversão",
};

const SLOT_STATUS_BADGE: Record<string, string> = {
  empty:     "bg-gray-100 text-gray-500",
  scheduled: "bg-indigo-50 text-indigo-700 border-indigo-200",
  published: "bg-teal-50 text-teal-700 border-teal-200",
  failed:    "bg-red-50 text-red-600 border-red-200",
};

function formatSlotDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}
function formatSlotTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function ScheduleView({ campaign, companySlug }: { campaign: CampaignBlueprint; companySlug: string }) {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data, isLoading, refetch } = useQuery<{ ok: boolean; slots: ScheduleSlot[] }>({
    queryKey: ["schedule-slots", campaign.id],
    queryFn: () => apiFetch(`/marketing/machine/campaigns-bp/${campaign.id}/schedule`),
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await apiFetch(`/marketing/machine/campaigns-bp/${campaign.id}/schedule/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period_days: campaign.period_days ?? 30, start_date: campaign.start_date ?? new Date().toISOString().slice(0, 10) }),
      });
      await refetch();
      toast.success("Calendário regenerado!");
    } catch (err: any) { toast.error(err.message ?? "Erro ao gerar calendário"); }
    finally { setGenerating(false); }
  };

  const handleUnassign = async (slotId: string) => {
    try {
      await apiFetch(`/marketing/machine/slots/${slotId}/creative`, { method: "DELETE" });
      await refetch();
      toast.success("Criativo desvinculado do slot");
    } catch { toast.error("Erro ao desvincular"); }
  };

  const slots = data?.slots ?? [];

  // Group by week
  const grouped: Record<string, ScheduleSlot[]> = {};
  for (const s of slots) {
    const weekNum = `Semana ${Math.ceil(s.slot_order / 7)}`;
    if (!grouped[weekNum]) grouped[weekNum] = [];
    grouped[weekNum].push(s);
  }

  const scheduled = slots.filter(s => s.status === "scheduled").length;
  const empty     = slots.filter(s => s.status === "empty").length;
  const published = slots.filter(s => s.status === "published").length;

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2 text-xs flex-wrap">
          <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-gray-600">
            <CalendarDays className="w-3.5 h-3.5" /> {slots.length} slots totais
          </span>
          {scheduled > 0 && <span className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1 text-indigo-700"><CheckCircle2 className="w-3.5 h-3.5" />{scheduled} agendados</span>}
          {empty > 0     && <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-amber-700"><Clock className="w-3.5 h-3.5" />{empty} vazios</span>}
          {published > 0 && <span className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-full px-3 py-1 text-teal-700"><Globe className="w-3.5 h-3.5" />{published} publicados</span>}
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating}
            className="h-8 gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Regenerar slots vazios
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
      )}

      {!isLoading && slots.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 py-12 text-center space-y-3">
          <CalendarDays className="w-10 h-10 text-indigo-300 mx-auto" />
          <p className="text-sm font-semibold text-gray-700">Nenhum slot gerado</p>
          <p className="text-xs text-gray-500">Clique em "Regenerar slots vazios" para criar o calendário editorial.</p>
          <Button size="sm" onClick={handleGenerate} disabled={generating} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
            Gerar calendário
          </Button>
        </div>
      )}

      {/* Weekly groups */}
      {Object.entries(grouped).map(([week, weekSlots]) => (
        <div key={week} className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5" /> {week}
            <span className="font-normal normal-case text-gray-400">
              ({weekSlots.filter(s => s.status !== "empty").length}/{weekSlots.length} preenchidos)
            </span>
          </h4>
          <div className="grid md:grid-cols-2 gap-2">
            {weekSlots.map(slot => (
              <div key={slot.id}
                className={`rounded-xl border p-3 flex items-start gap-3 transition-all
                  ${slot.status === "empty" ? "border-dashed border-gray-200 bg-gray-50/50 opacity-70" : "border-gray-200 bg-white shadow-sm"}`}>
                {/* Date/time column */}
                <div className="shrink-0 text-center min-w-[52px]">
                  <p className="text-[11px] font-medium text-gray-600 leading-tight capitalize">{formatSlotDate(slot.scheduled_at)}</p>
                  <p className="text-[10px] text-gray-400">{formatSlotTime(slot.scheduled_at)}</p>
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {slot.stage_focus && (
                      <span className="text-[10px] rounded-full px-2 py-0.5 bg-violet-50 text-violet-600 border border-violet-100">
                        {STAGE_LABEL[slot.stage_focus] ?? slot.stage_focus}
                      </span>
                    )}
                    {slot.channel && (
                      <span className="text-[10px] rounded-full px-2 py-0.5 bg-gray-50 text-gray-500 border border-gray-100">{slot.channel}</span>
                    )}
                    <span className={`ml-auto text-[10px] rounded-full px-2 py-0.5 border ${SLOT_STATUS_BADGE[slot.status] ?? "bg-gray-50 text-gray-500"}`}>
                      {slot.status === "empty" ? "Vazio" : slot.status === "scheduled" ? "Agendado" : slot.status === "published" ? "Publicado" : slot.status}
                    </span>
                  </div>
                  {slot.creative ? (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-700 truncate flex-1 font-medium">{slot.creative.headline ?? "(sem headline)"}</p>
                      <button onClick={() => handleUnassign(slot.id)}
                        title="Desvincular criativo"
                        className="shrink-0 p-1 rounded-md hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                        <Unlink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Aguardando criativo aprovado</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Step 3: Creative System ───────────────────────────────────────────────────

const MODO_CFG = {
  conceitual: { label: "Conceitual", icon: Sparkles, color: "violet", desc: "Branding, editorial, awareness" },
  comercial:  { label: "Comercial",  icon: ShoppingBag, color: "orange", desc: "Venda, performance, conversão" },
  hibrido:    { label: "Híbrido",    icon: Layers, color: "blue", desc: "Foto real + copy estratégico" },
} as const;

const STATUS_CFG: Record<string, { label: string; cardBorder: string; headerBg: string; badgeClass: string }> = {
  generated:     { label: "Gerado",       cardBorder: "border-blue-200",   headerBg: "bg-blue-50/30",   badgeClass: "text-blue-700 bg-blue-50 border-blue-200" },
  pendente:      { label: "Gerado",       cardBorder: "border-gray-200",   headerBg: "bg-gray-50/50",   badgeClass: "text-gray-600 bg-gray-50 border-gray-200" },
  in_review:     { label: "Em revisão",   cardBorder: "border-amber-200",  headerBg: "bg-amber-50/30",  badgeClass: "text-amber-700 bg-amber-50 border-amber-200" },
  approved:      { label: "Aprovado",     cardBorder: "border-green-300",  headerBg: "bg-green-50/30",  badgeClass: "text-green-700 bg-green-50 border-green-200" },
  aprovado:      { label: "Aprovado",     cardBorder: "border-green-300",  headerBg: "bg-green-50/30",  badgeClass: "text-green-700 bg-green-50 border-green-200" },
  rejected:      { label: "Reprovado",    cardBorder: "border-red-200",    headerBg: "bg-red-50/30",    badgeClass: "text-red-600 bg-red-50 border-red-200" },
  reprovado:     { label: "Reprovado",    cardBorder: "border-red-200",    headerBg: "bg-red-50/30",    badgeClass: "text-red-600 bg-red-50 border-red-200" },
  in_production: { label: "Em produção",  cardBorder: "border-violet-300", headerBg: "bg-violet-50/30", badgeClass: "text-violet-700 bg-violet-50 border-violet-200" },
  published:     { label: "Publicado",    cardBorder: "border-teal-300",   headerBg: "bg-teal-50/30",   badgeClass: "text-teal-700 bg-teal-50 border-teal-200" },
};

const CANAIS = ["Instagram Feed", "Instagram Stories", "Instagram Reels", "WhatsApp", "E-mail", "Site"];
const FORMATOS = ["Post estático", "Carrossel", "Vídeo curto", "Story animado", "Banner"];
const PROPORCOES = ["1:1", "4:5", "9:16", "16:9"];

function CreativeCard({
  creative, campaignId, companySlug,
}: { creative: MachineCreative; campaignId: string; companySlug: string }) {
  const qc = useQueryClient();
  const modoCfg = MODO_CFG[creative.modo_criativo] ?? MODO_CFG.hibrido;
  const ModeIcon = modoCfg.icon;
  const statusCfg = STATUS_CFG[creative.status_aprovacao] ?? STATUS_CFG.pendente;

  const [editing, setEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [editForm, setEditForm] = useState({
    headline: creative.headline ?? "", hook: creative.hook ?? "",
    legenda: creative.legenda ?? "", cta: creative.cta ?? "",
    direcao_arte: creative.direcao_arte ?? "", prompt_visual: creative.prompt_visual ?? "",
    video_prompt: creative.video_prompt ?? "", objetivo_peca: creative.objetivo_peca ?? "",
  });

  function score(v: string | null | undefined) { return v != null && v !== "" ? parseFloat(v) : null; }
  const scores = [score(creative.brand_fit_score), score(creative.campaign_fit_score), score(creative.commercial_strength_score), score(creative.visual_quality_score)];
  const validScores = scores.filter(s => s !== null) as number[];
  const avgScore = validScores.length ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null;
  const isLoading = actionLoading !== null;
  const isApproved = creative.status_aprovacao === "approved" || creative.status_aprovacao === "aprovado";
  const isRejected = creative.status_aprovacao === "rejected" || creative.status_aprovacao === "reprovado";
  const isInProduction = creative.status_aprovacao === "in_production";
  const isPublished = creative.status_aprovacao === "published";
  const hasImage = !!creative.asset_storage_path;

  async function handleStatus(newStatus: string, actionKey: string, msg: string) {
    setActionLoading(actionKey);
    try {
      await apiFetch(`/marketing/machine/creatives/${creative.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_aprovacao: newStatus, company_slug: companySlug }),
      });
      qc.invalidateQueries({ queryKey: ["machine-creatives", campaignId] });
      toast.success(msg);
    } catch (err: any) { toast.error(err.message ?? "Erro ao atualizar"); }
    finally { setActionLoading(null); }
  }

  async function handleSaveEdit() {
    setActionLoading("save");
    try {
      const wasGenerated = creative.status_aprovacao === "generated" || creative.status_aprovacao === "pendente";
      const patch: Record<string, unknown> = { ...editForm, company_slug: companySlug };
      if (wasGenerated) patch.status_aprovacao = "in_review";
      await apiFetch(`/marketing/machine/creatives/${creative.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      qc.invalidateQueries({ queryKey: ["machine-creatives", campaignId] });
      setEditing(false);
      toast.success("Criativo salvo!");
    } catch (err: any) { toast.error(err.message ?? "Erro ao salvar"); }
    finally { setActionLoading(null); }
  }

  async function handleRegenerate() {
    setActionLoading("regen");
    try {
      await apiFetch(`/marketing/machine/creatives/${creative.id}/regenerate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_slug: companySlug }),
      });
      qc.invalidateQueries({ queryKey: ["machine-creatives", campaignId] });
      toast.success("Criativo regenerado pelo GPT-4o!");
    } catch (err: any) { toast.error(err.message ?? "Erro ao regenerar"); }
    finally { setActionLoading(null); }
  }

  async function handleGenerateImage() {
    setActionLoading("genImg");
    try {
      await apiFetch(`/marketing/machine/creatives/${creative.id}/generate-image`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_slug: companySlug, branding_variant: "auto" }),
      });
      qc.invalidateQueries({ queryKey: ["machine-creatives", campaignId] });
      toast.success("Imagem gerada! Criativo movido para produção.");
    } catch (err: any) { toast.error(err.message ?? "Erro ao gerar imagem"); }
    finally { setActionLoading(null); }
  }

  async function handlePublish(data: { publishMode: "immediate" | "scheduled"; scheduledAt: string | null; captionOverride?: string }) {
    setActionLoading("publish");
    try {
      const result = await apiFetch(`/marketing/machine/creatives/${creative.id}/publish`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publish_mode: data.publishMode,
          scheduled_at: data.scheduledAt,
          caption_override: data.captionOverride,
          company_slug: companySlug,
        }),
      });
      qc.invalidateQueries({ queryKey: ["machine-creatives", campaignId] });
      setShowPublish(false);
      if (result.ok) {
        const webhookUsed = result.webhook_used ? ` (${result.webhook_used})` : "";
        toast.success(
          data.publishMode === "immediate"
            ? `Enviado para o n8n${webhookUsed} — verifique se apareceu no Instagram`
            : `Agendamento enviado para o n8n${webhookUsed}`,
          { duration: 6000 }
        );
      } else {
        toast.error(result.error ?? "Publicação falhou — verifique as configurações do Instagram.");
      }
    } catch (err: any) { toast.error(err.message ?? "Erro ao publicar"); }
    finally { setActionLoading(null); }
  }

  async function handleDelete() {
    setActionLoading("delete");
    try {
      await apiFetch(`/marketing/machine/creatives/${creative.id}`, { method: "DELETE" });
      qc.invalidateQueries({ queryKey: ["machine-creatives", campaignId] });
      toast.success("Criativo excluído");
    } catch (err: any) { toast.error(err.message ?? "Erro ao excluir"); }
    finally { setActionLoading(null); }
  }

  async function handlePickFromLibrary(asset: TenantAsset) {
    setShowLibrary(false);
    setActionLoading("library");
    try {
      await apiFetch(`/marketing/machine/creatives/${creative.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_storage_path: asset.storagePath,
          status_aprovacao: "in_production",
          company_slug: companySlug,
        }),
      });
      await qc.refetchQueries({ queryKey: ["machine-creatives", campaignId] });
      toast.success("Imagem da biblioteca aplicada ao criativo!");
    } catch (err: any) { toast.error(err.message ?? "Erro ao aplicar imagem"); }
    finally { setActionLoading(null); }
  }

  function openEdit() {
    setEditForm({ headline: creative.headline ?? "", hook: creative.hook ?? "", legenda: creative.legenda ?? "", cta: creative.cta ?? "", direcao_arte: creative.direcao_arte ?? "", prompt_visual: creative.prompt_visual ?? "", video_prompt: creative.video_prompt ?? "", objetivo_peca: creative.objetivo_peca ?? "" });
    setEditing(true);
  }

  const EDIT_FIELDS: { k: string; label: string; rows: number }[] = [
    { k: "headline", label: "Headline", rows: 1 },
    { k: "hook", label: "Hook", rows: 2 },
    { k: "legenda", label: "Legenda", rows: 4 },
    { k: "cta", label: "CTA", rows: 1 },
    { k: "direcao_arte", label: "Direção de arte", rows: 2 },
    { k: "objetivo_peca", label: "Objetivo da peça", rows: 1 },
    { k: "prompt_visual", label: "Prompt visual", rows: 2 },
    { k: "video_prompt", label: "Prompt de vídeo (Reels/Stories)", rows: 2 },
  ];

  return (
    <>
    <div className={`rounded-xl border bg-white overflow-hidden transition-all ${statusCfg.cardBorder} ${isRejected ? "opacity-60" : ""}`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 ${statusCfg.headerBg}`}>
        <div className={`w-6 h-6 rounded flex items-center justify-center bg-${modoCfg.color}-100`}>
          <ModeIcon className={`w-3.5 h-3.5 text-${modoCfg.color}-600`} />
        </div>
        <span className="text-xs font-semibold text-gray-700">{modoCfg.label}</span>
        {creative.canal && <span className="text-[10px] text-gray-400 bg-white/70 px-1.5 py-0.5 rounded-full border border-gray-200">{creative.canal}</span>}
        {creative.formato && <span className="text-[10px] text-gray-400 bg-white/70 px-1.5 py-0.5 rounded-full border border-gray-200">{creative.formato}</span>}
        <div className="ml-auto flex items-center gap-1.5">
          {creative.template_used && (
            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5" title={`Template: ${creative.template_used}`}>
              <Layers className="w-2.5 h-2.5" /> {creative.template_used.replace(/_/g, " ")}
            </span>
          )}
          {hasImage && (
            <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <ImageIcon className="w-2.5 h-2.5" /> Imagem
            </span>
          )}
          {avgScore !== null && (
            <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />{avgScore}
            </span>
          )}
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${statusCfg.badgeClass}`}>{statusCfg.label}</span>
        </div>
      </div>

      {/* Body */}
      {editing ? (
        <div className="p-4 space-y-3 bg-violet-50/20">
          <p className="text-xs font-semibold text-violet-600 flex items-center gap-1"><Edit3 className="w-3 h-3" /> Editando criativo</p>
          {EDIT_FIELDS.map(({ k, label, rows }) => (
            <div key={k}>
              <label className="text-[10px] text-gray-500 uppercase font-semibold mb-0.5 block">{label}</label>
              {rows === 1
                ? <Input value={(editForm as Record<string, string>)[k]} onChange={e => setEditForm(p => ({ ...p, [k]: e.target.value }))} className="h-8 text-sm" placeholder={label} />
                : <Textarea value={(editForm as Record<string, string>)[k]} onChange={e => setEditForm(p => ({ ...p, [k]: e.target.value }))} rows={rows} className="text-sm resize-none" placeholder={label} />}
            </div>
          ))}
          <div className="flex gap-2 pt-1 border-t border-violet-100">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={isLoading}>Cancelar</Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={isLoading} className="gap-1.5 bg-violet-600 hover:bg-violet-700">
              {actionLoading === "save" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {/* Imagem gerada — thumbnail + indicador */}
          {hasImage && creative.asset_storage_path && (
            <div className="rounded-lg overflow-hidden border border-green-200 bg-green-50/30 cursor-pointer" onClick={() => setShowPreview(true)}>
              <img
                src={machineImgUrl(creative.asset_storage_path)}
                alt="Imagem gerada"
                className="w-full max-h-36 object-cover"
              />
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0" />
                <span className="text-[10px] text-green-700 font-semibold">Imagem gerada — clique para ver prévia</span>
              </div>
            </div>
          )}
          {creative.headline && <div><p className="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Headline</p><p className="text-sm font-semibold text-gray-900">{creative.headline}</p></div>}
          {creative.hook && <div><p className="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Hook</p><p className="text-sm text-gray-700">{creative.hook}</p></div>}
          {creative.legenda && <div><p className="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Legenda</p><p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{creative.legenda}</p></div>}
          {creative.cta && <div className="inline-flex items-center gap-1 bg-violet-50 border border-violet-100 text-violet-700 text-xs px-2.5 py-1 rounded-full font-medium">{creative.cta}</div>}
          {creative.direcao_arte && (
            <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Direção de arte</p>
              <p className="text-xs text-gray-600">{creative.direcao_arte}</p>
            </div>
          )}
          {creative.video_prompt && (
            <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
              <p className="text-[10px] text-blue-500 uppercase font-semibold mb-0.5 flex items-center gap-1"><Film className="w-3 h-3" /> Prompt de vídeo</p>
              <p className="text-xs text-blue-700 line-clamp-2">{creative.video_prompt}</p>
            </div>
          )}
          {validScores.length > 0 && (
            <div className="grid grid-cols-4 gap-1 pt-2 border-t border-gray-100">
              {[
                { label: "Brand", val: score(creative.brand_fit_score) },
                { label: "Camp.", val: score(creative.campaign_fit_score) },
                { label: "Comercial", val: score(creative.commercial_strength_score) },
                { label: "Visual", val: score(creative.visual_quality_score) },
              ].map(({ label, val }) => (
                <div key={label} className="text-center">
                  <p className="text-[10px] text-gray-400">{label}</p>
                  <p className={`text-sm font-bold ${val !== null ? (val >= 7 ? "text-green-600" : val >= 5 ? "text-amber-500" : "text-red-500") : "text-gray-300"}`}>{val !== null ? val : "—"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action bar */}
      {!editing && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-t border-gray-100 bg-gray-50/30 flex-wrap">
          <Button size="sm" variant="ghost" onClick={() => handleStatus("approved", "approve", "Aprovado!")} disabled={isLoading || isApproved}
            className={`h-7 gap-1 text-xs ${isApproved ? "text-green-700 font-semibold bg-green-50" : "text-green-600 hover:bg-green-50"}`}>
            {actionLoading === "approve" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />} Aprovar
          </Button>
          <Button size="sm" variant="ghost" onClick={openEdit} disabled={isLoading} className="h-7 gap-1 text-xs text-gray-600 hover:bg-gray-100">
            <Edit3 className="w-3 h-3" /> Editar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleStatus("rejected", "reject", "Reprovado.")} disabled={isLoading || isRejected}
            className={`h-7 gap-1 text-xs ${isRejected ? "text-red-700 font-semibold bg-red-50" : "text-red-500 hover:bg-red-50"}`}>
            {actionLoading === "reject" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsDown className="w-3 h-3" />} Reprovar
          </Button>
          <Button size="sm" variant="ghost" onClick={handleRegenerate} disabled={isLoading} className="h-7 gap-1 text-xs text-amber-600 hover:bg-amber-50">
            {actionLoading === "regen" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Regenerar
          </Button>
          {/* Gerar imagem por IA — SEMPRE visível (com ou sem imagem) */}
          <Button size="sm" variant="ghost" onClick={handleGenerateImage} disabled={isLoading}
            className="h-7 gap-1 text-xs text-indigo-600 hover:bg-indigo-50 border border-indigo-200">
            {actionLoading === "genImg" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
            {actionLoading === "genImg" ? "Gerando..." : "Gerar imagem"}
          </Button>
          {/* Galeria: "Da galeria" sem imagem, "Trocar" com imagem — SEMPRE visível */}
          <Button size="sm" variant="ghost" onClick={() => setShowLibrary(true)} disabled={isLoading}
            className="h-7 gap-1 text-xs text-emerald-600 hover:bg-emerald-50 border border-emerald-200">
            {actionLoading === "library" ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderOpen className="w-3 h-3" />}
            {hasImage ? "Trocar" : "Da galeria"}
          </Button>
          {/* Preview — só quando tem imagem */}
          {hasImage && (
            <Button size="sm" variant="ghost" onClick={() => setShowPreview(true)} disabled={isLoading}
              className="h-7 gap-1 text-xs text-teal-600 hover:bg-teal-50">
              <Eye className="w-3 h-3" /> Preview
            </Button>
          )}
          {/* Publicar — só quando tem imagem e não publicado */}
          {hasImage && !isPublished && (
            <Button size="sm" variant="ghost" onClick={() => setShowPublish(true)} disabled={isLoading}
              className="h-7 gap-1 text-xs text-pink-600 hover:bg-pink-50">
              {actionLoading === "publish" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Publicar
            </Button>
          )}
          {/* Confirmar publicado — quando já enviado ao n8n */}
          {isInProduction && creative.publication_id && (
            <Button size="sm" variant="ghost"
              onClick={() => handleStatus("published", "confirm_pub", "✓ Marcado como publicado!")}
              disabled={isLoading}
              className="h-7 gap-1 text-xs text-teal-600 hover:bg-teal-50 border border-teal-200">
              {actionLoading === "confirm_pub" ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Confirmar publicado
            </Button>
          )}
          {/* Produção manual — só sem imagem */}
          {!hasImage && (
            <Button size="sm" variant="ghost" onClick={() => handleStatus("in_production", "production", "Enviado para produção!")} disabled={isLoading || isInProduction || isPublished}
              className={`h-7 gap-1 text-xs ${isInProduction ? "text-violet-700 font-semibold bg-violet-50" : isPublished ? "text-teal-700 font-semibold" : "text-violet-600 hover:bg-violet-50"}`}>
              {actionLoading === "production" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
              {isInProduction ? "Em produção" : isPublished ? "Publicado" : "Produção"}
            </Button>
          )}
          <div className="ml-auto">
            <Button size="sm" variant="ghost" onClick={handleDelete} disabled={isLoading} className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50">
              {actionLoading === "delete" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      )}
    </div>
    {/* Modals */}
    {showPreview && creative.asset_storage_path && (
      <MachineInstagramPreviewModal
        creative={creative}
        companySlug={companySlug}
        onClose={() => setShowPreview(false)}
      />
    )}
    {showLibrary && (
      <MachineLibraryPickerModal
        companySlug={companySlug}
        onSelect={handlePickFromLibrary}
        onClose={() => setShowLibrary(false)}
      />
    )}
    {showPublish && (
      <MachinePublishModal
        creative={creative}
        companySlug={companySlug}
        onClose={() => setShowPublish(false)}
        onConfirm={handlePublish}
        loading={actionLoading === "publish"}
      />
    )}
    </>
  );
}

function NewCreativeForm({
  campaignId, companySlug, onCreated, onCancel,
}: { campaignId: string; companySlug: string; onCreated: () => void; onCancel: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    modo_criativo: "conceitual" as "conceitual" | "comercial" | "hibrido",
    canal: "", formato: "", objetivo_peca: "",
    headline: "", hook: "", legenda: "", cta: "",
    direcao_arte: "", prompt_visual: "", video_prompt: "",
    proporcao: "1:1",
    brand_fit_score: "", campaign_fit_score: "", commercial_strength_score: "", visual_quality_score: "",
  });
  function set(k: string, v: unknown) { setForm(p => ({ ...p, [k]: v })); }

  const mut = useMutation({
    mutationFn: () => apiFetch(`/marketing/machine/campaigns-bp/${campaignId}/creatives`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        company_slug: companySlug,
        brand_fit_score: form.brand_fit_score ? parseFloat(form.brand_fit_score) : null,
        campaign_fit_score: form.campaign_fit_score ? parseFloat(form.campaign_fit_score) : null,
        commercial_strength_score: form.commercial_strength_score ? parseFloat(form.commercial_strength_score) : null,
        visual_quality_score: form.visual_quality_score ? parseFloat(form.visual_quality_score) : null,
      }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["machine-creatives", campaignId] }); toast.success("Criativo adicionado!"); onCreated(); },
    onError: () => toast.error("Erro ao criar criativo"),
  });

  return (
    <div className="rounded-xl border-2 border-violet-200 bg-violet-50/30 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Novo criativo</h3>
        <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 w-7 p-0"><X className="w-4 h-4" /></Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-2">
        {(Object.keys(MODO_CFG) as Array<keyof typeof MODO_CFG>).map(m => {
          const cfg = MODO_CFG[m];
          const Icon = cfg.icon;
          return (
            <button key={m} onClick={() => set("modo_criativo", m)}
              className={`rounded-lg border-2 p-3 text-left transition-all ${form.modo_criativo === m ? `border-${cfg.color}-400 bg-${cfg.color}-50` : "border-gray-200 bg-white hover:border-gray-300"}`}>
              <Icon className={`w-4 h-4 mb-1 ${form.modo_criativo === m ? `text-${cfg.color}-600` : "text-gray-400"}`} />
              <p className="text-xs font-semibold text-gray-800">{cfg.label}</p>
              <p className="text-[10px] text-gray-400">{cfg.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Canal</label>
          <select value={form.canal} onChange={e => set("canal", e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs">
            <option value="">Selecionar</option>
            {CANAIS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Formato</label>
          <select value={form.formato} onChange={e => set("formato", e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs">
            <option value="">Selecionar</option>
            {FORMATOS.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Proporção</label>
          <select value={form.proporcao} onChange={e => set("proporcao", e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs">
            {PROPORCOES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Objetivo da peça</label>
        <Input value={form.objetivo_peca} onChange={e => set("objetivo_peca", e.target.value)} placeholder="ex: Gerar curiosidade sobre o produto" className="h-8 text-sm" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Headline</label>
        <Input value={form.headline} onChange={e => set("headline", e.target.value)} placeholder="Título principal da peça" className="h-8 text-sm" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Hook</label>
        <Input value={form.hook} onChange={e => set("hook", e.target.value)} placeholder="Primeira frase que para o scroll" className="h-8 text-sm" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Legenda</label>
        <Textarea value={form.legenda} onChange={e => set("legenda", e.target.value)} rows={3} className="text-sm resize-none" placeholder="Texto completo do post" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">CTA</label>
          <Input value={form.cta} onChange={e => set("cta", e.target.value)} placeholder="ex: Clique no link da bio" className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Direção de arte</label>
          <Input value={form.direcao_arte} onChange={e => set("direcao_arte", e.target.value)} placeholder="ex: Foto produto, fundo branco, texto bold" className="h-8 text-sm" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Prompt visual</label>
        <Textarea value={form.prompt_visual} onChange={e => set("prompt_visual", e.target.value)} rows={2} className="text-sm resize-none" placeholder="Prompt para geração de imagem com IA" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-1"><Film className="w-3 h-3 text-blue-400" /> Prompt de vídeo (Reels/Stories — opcional)</label>
        <Textarea value={form.video_prompt} onChange={e => set("video_prompt", e.target.value)} rows={2} className="text-sm resize-none" placeholder="Roteiro/direção para vídeo curto" />
      </div>

      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-violet-100">
        <p className="col-span-4 text-[10px] text-gray-400 uppercase font-semibold">Scores de validação (0-10)</p>
        {[
          { k: "brand_fit_score", label: "Brand Fit" },
          { k: "campaign_fit_score", label: "Campaign Fit" },
          { k: "commercial_strength_score", label: "Força comercial" },
          { k: "visual_quality_score", label: "Qualidade visual" },
        ].map(({ k, label }) => (
          <div key={k}>
            <label className="text-[10px] text-gray-500 mb-0.5 block">{label}</label>
            <Input type="number" min="0" max="10" step="0.1" value={(form as any)[k]} onChange={e => set(k, e.target.value)} className="h-7 text-xs" placeholder="—" />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending} className="gap-1.5 bg-violet-600 hover:bg-violet-700">
          {mut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Adicionar criativo
        </Button>
      </div>
    </div>
  );
}

function CreativeSystemStep({
  campaign, companySlug, onBack,
}: { campaign: CampaignBlueprint; companySlug: string; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<"criativos" | "calendario">("criativos");
  const [filterModo, setFilterModo] = useState<"todos" | "conceitual" | "comercial" | "hibrido">("todos");
  const [filterStatus, setFilterStatus] = useState<"todos" | string>("todos");
  const [showNew, setShowNew] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingMore, setGeneratingMore] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ ok: boolean; creatives: MachineCreative[] }>({
    queryKey: ["machine-creatives", campaign.id],
    queryFn: () => apiFetch(`/marketing/machine/campaigns-bp/${campaign.id}/creatives`),
  });

  const handleGeneratePack = async () => {
    setGenerating(true);
    try {
      const result = await apiFetch(`/marketing/machine/campaigns-bp/${campaign.id}/generate-creatives`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_slug: companySlug, pieces_count: 8 }),
      });
      qc.invalidateQueries({ queryKey: ["machine-creatives", campaign.id] });
      toast.success(`${result.total} criativos gerados com sucesso!`);
    } catch (err: any) { toast.error(err.message ?? "Erro ao gerar pacote criativo"); }
    finally { setGenerating(false); }
  };

  const handleGenerateMore = async (modo?: string) => {
    const key = modo ?? "all";
    setGeneratingMore(key);
    try {
      const result = await apiFetch(`/marketing/machine/campaigns-bp/${campaign.id}/generate-more`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_slug: companySlug, count: 3, ...(modo ? { modo } : {}) }),
      });
      qc.invalidateQueries({ queryKey: ["machine-creatives", campaign.id] });
      toast.success(`+${result.total} criativos adicionados!`);
    } catch (err: any) { toast.error(err.message ?? "Erro ao gerar mais criativos"); }
    finally { setGeneratingMore(null); }
  };

  const all = data?.creatives ?? [];

  const statusCounts: Record<string, number> = {};
  for (const c of all) {
    const s = c.status_aprovacao;
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }
  const approvedCount = (statusCounts["approved"] ?? 0) + (statusCounts["aprovado"] ?? 0);
  const inProductionCount = statusCounts["in_production"] ?? 0;
  const rejectedCount = (statusCounts["rejected"] ?? 0) + (statusCounts["reprovado"] ?? 0);
  const inReviewCount = statusCounts["in_review"] ?? 0;
  const generatedCount = (statusCounts["generated"] ?? 0) + (statusCounts["pendente"] ?? 0);
  const publishedCount = statusCounts["published"] ?? 0;

  const modoCounts = {
    todos: all.length,
    conceitual: all.filter(c => c.modo_criativo === "conceitual").length,
    comercial: all.filter(c => c.modo_criativo === "comercial").length,
    hibrido: all.filter(c => c.modo_criativo === "hibrido").length,
  };

  const filtered = all.filter(c => {
    const modoOk = filterModo === "todos" || c.modo_criativo === filterModo;
    const statusOk = filterStatus === "todos"
      || (filterStatus === "approved" && (c.status_aprovacao === "approved" || c.status_aprovacao === "aprovado"))
      || (filterStatus === "rejected" && (c.status_aprovacao === "rejected" || c.status_aprovacao === "reprovado"))
      || c.status_aprovacao === filterStatus;
    return modoOk && statusOk;
  });

  const isBusy = generating || generatingMore !== null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-gray-500 hover:text-gray-900 shrink-0">
          <ArrowLeft className="w-4 h-4" /> Campanhas
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900">Creative System</h2>
            <SuficiencyBadge level={campaign.suficiency.level} score={campaign.suficiency.score} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5 truncate">{campaign.nome}</p>
        </div>
        {activeTab === "criativos" && (
          <div className="flex gap-2 shrink-0">
            {all.length > 0 && (
              <Button variant="outline" onClick={() => setShowNew(v => !v)} className="gap-1.5 text-gray-600 border-gray-300 h-9">
                <Plus className="w-4 h-4" /> Manual
              </Button>
            )}
            <Button onClick={handleGeneratePack} disabled={isBusy} className="gap-1.5 bg-violet-600 hover:bg-violet-700 h-9">
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Sparkles className="w-4 h-4" /> {all.length > 0 ? "Regerar pacote" : "Gerar pacote"}</>}
            </Button>
          </div>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-gray-200 pb-0">
        <button onClick={() => setActiveTab("criativos")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px
            ${activeTab === "criativos" ? "border-violet-600 text-violet-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          <Layers className="w-4 h-4" /> Criativos
          {all.length > 0 && <span className="ml-1 rounded-full bg-violet-100 text-violet-600 text-[10px] font-bold px-1.5 py-0.5">{all.length}</span>}
        </button>
        <button onClick={() => setActiveTab("calendario")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px
            ${activeTab === "calendario" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          <CalendarDays className="w-4 h-4" /> Calendário
          {campaign.period_days && (
            <span className="ml-1 rounded-full bg-indigo-50 text-indigo-500 text-[10px] font-bold px-1.5 py-0.5">{campaign.period_days}d</span>
          )}
        </button>
      </div>

      {/* Calendar tab */}
      {activeTab === "calendario" && (
        <ScheduleView campaign={campaign} companySlug={companySlug} />
      )}

      {/* Criativos tab content below */}
      {activeTab !== "criativos" ? null : <>

      {/* Generating state */}
      {generating && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-6 text-center space-y-2">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-violet-800">GPT-4o gerando pacote criativo...</p>
          <p className="text-xs text-violet-500">8 peças únicas — pode levar até 40 segundos</p>
        </div>
      )}

      {/* Empty state */}
      {!generating && !isLoading && all.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40 py-14 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 text-violet-500" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-800">Nenhum criativo gerado ainda</p>
            <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">O GPT-4o cria 8 peças completas — headline, hook, legenda, CTA e direção de arte para cada canal.</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={handleGeneratePack} disabled={isBusy} className="gap-1.5 bg-violet-600 hover:bg-violet-700">
              <Sparkles className="w-4 h-4" /> Gerar pacote criativo
            </Button>
            <Button variant="outline" onClick={() => setShowNew(true)} className="gap-1.5 text-gray-500">
              <Plus className="w-4 h-4" /> Criar manual
            </Button>
          </div>
        </div>
      )}

      {/* Operational stats row */}
      {all.length > 0 && !generating && (
        <div className="grid grid-cols-6 gap-2">
          {[
            { key: "todos", label: "Total", count: all.length, cls: "text-gray-700", border: "border-gray-200" },
            { key: "generated", label: "Gerados", count: generatedCount, cls: "text-blue-600", border: "border-blue-100" },
            { key: "in_review", label: "Em revisão", count: inReviewCount, cls: "text-amber-600", border: "border-amber-100" },
            { key: "approved", label: "Aprovados", count: approvedCount, cls: "text-green-600", border: "border-green-200" },
            { key: "in_production", label: "Em produção", count: inProductionCount, cls: "text-violet-600", border: "border-violet-200" },
            { key: "rejected", label: "Reprovados", count: rejectedCount, cls: "text-red-500", border: "border-red-100" },
          ].map(({ key, label, count, cls, border }) => (
            <button key={key} onClick={() => setFilterStatus(key as any)}
              className={`rounded-xl border p-3 text-center transition-all ${filterStatus === key ? `${border} bg-gray-50 ring-1 ring-inset ring-gray-300` : "border-gray-200 bg-white hover:border-gray-300"}`}>
              <p className={`text-xl font-bold ${cls}`}>{count}</p>
              <p className="text-[10px] text-gray-500 leading-tight">{label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Approved + in production summary */}
      {(approvedCount > 0 || inProductionCount > 0 || publishedCount > 0) && !generating && (
        <div className="flex flex-wrap gap-2">
          {approvedCount > 0 && <span className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1 text-xs text-green-700 font-medium"><CheckCircle2 className="w-3.5 h-3.5" />{approvedCount} aprovado{approvedCount !== 1 ? "s" : ""}</span>}
          {inProductionCount > 0 && <span className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-full px-3 py-1 text-xs text-violet-700 font-medium"><Rocket className="w-3.5 h-3.5" />{inProductionCount} em produção</span>}
          {publishedCount > 0 && <span className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-full px-3 py-1 text-xs text-teal-700 font-medium"><Globe className="w-3.5 h-3.5" />{publishedCount} publicado{publishedCount !== 1 ? "s" : ""}</span>}
        </div>
      )}

      {/* Mode filter tabs + generate-more buttons */}
      {all.length > 0 && !generating && (
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3">
          <div className="flex gap-1">
            {(["todos", "conceitual", "comercial", "hibrido"] as const).map(m => (
              <button key={m} onClick={() => setFilterModo(m)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all border ${filterModo === m ? "bg-violet-600 text-white border-violet-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                {m === "todos" ? `Todos (${modoCounts.todos})` : `${MODO_CFG[m].label} (${modoCounts[m]})`}
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" onClick={() => handleGenerateMore()} disabled={isBusy}
              className="h-7 gap-1 text-xs text-violet-600 border-violet-200 hover:bg-violet-50">
              {generatingMore === "all" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} +3
            </Button>
            {(["conceitual", "comercial", "hibrido"] as const).map(m => (
              <Button key={m} size="sm" variant="outline" onClick={() => handleGenerateMore(m)} disabled={isBusy}
                className="h-7 gap-1 text-xs text-gray-600 border-gray-200 hover:bg-gray-50">
                {generatingMore === m ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} +3 {MODO_CFG[m].label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {showNew && (
        <NewCreativeForm campaignId={campaign.id} companySlug={companySlug}
          onCreated={() => setShowNew(false)} onCancel={() => setShowNew(false)} />
      )}

      {isLoading && !generating ? (
        <div className="flex items-center justify-center py-12 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : !generating && filtered.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(c => (
            <CreativeCard key={c.id} creative={c} campaignId={campaign.id} companySlug={companySlug} />
          ))}
        </div>
      ) : !generating && all.length > 0 && filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center text-gray-400">
          <p className="text-sm">Nenhum criativo para este filtro</p>
        </div>
      ) : null}

      </>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MaquinaMarketing() {
  const { user } = useAuth();
  const [, nav] = useLocation();
  const search = useSearch();
  const urlSlug = new URLSearchParams(search).get("slug") ?? "";

  const { data: myCompanyData, isLoading: loadingSlug } = useQuery<{ ok: boolean; company_slug: string }>({
    queryKey: ["machine-my-company", urlSlug],
    queryFn: () => apiFetch(`/marketing/machine/my-company${urlSlug ? `?company_slug=${urlSlug}` : ""}`),
    enabled: !!user,
    retry: false,
  });
  const companySlug = myCompanyData?.company_slug ?? urlSlug;

  const [step, setStep] = useState<MachineStep>("brand");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignBlueprint | null>(null);

  const { data: brandData } = useQuery<{ ok: boolean; brand: BrandBlueprint | null; suficiency: Suficiency }>({
    queryKey: ["machine-brand", companySlug],
    queryFn: () => apiFetch(`/marketing/machine/brand?company_slug=${companySlug}`),
    enabled: !!companySlug,
  });

  const brandSuficiency = brandData?.suficiency ?? { score: 0, level: "incompleto" as const };

  const machineState =
    brandSuficiency.level === "incompleto" ? "construcao_de_brand" :
    step === "campaigns" && selectedCampaign?.suficiency?.level === "incompleto" ? "refinamento_de_campanha" :
    "pronto_para_criacao";

  const stateLabels = {
    construcao_de_brand: { label: "Construindo brand", color: "bg-red-100 text-red-700" },
    refinamento_de_campanha: { label: "Refinando campanha", color: "bg-amber-100 text-amber-700" },
    pronto_para_criacao: { label: "Pronto para criar", color: "bg-green-100 text-green-700" },
  };
  const stateInfo = stateLabels[machineState];

  const STEPS = [
    { key: "brand" as const, label: "Brand Foundation", icon: Building2 },
    { key: "campaigns" as const, label: "Campaign Strategy", icon: Target },
    { key: "creatives" as const, label: "Creative System", icon: Zap },
  ];

  if (loadingSlug && !companySlug) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span className="text-sm">Carregando...</span>
      </div>
    );
  }

  if (!loadingSlug && !companySlug) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold text-sm">Empresa não mapeada</p>
          <p className="text-gray-400 text-xs mt-1 mb-4">Acesse a Máquina de Marketing a partir do painel de marketing selecionando uma empresa.</p>
          <button onClick={() => nav("/hub/marketing")} className="text-xs text-violet-600 hover:underline">← Voltar ao painel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => nav("/hub/marketing")} className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">Máquina de Marketing</h1>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stateInfo.color}`}>{stateInfo.label}</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Brand Blueprint → Campaign Blueprint → Creative System</p>
          </div>
        </div>

        {/* Step navigator */}
        <div className="flex items-center gap-0 mb-8 bg-white rounded-xl border border-gray-200 p-1">
          {STEPS.map(({ key, label, icon: Icon }, idx) => {
            const active = step === key || (key === "creatives" && step === "creatives");
            const isCreatives = key === "creatives";
            const disabled = isCreatives && !selectedCampaign;
            return (
              <button
                key={key}
                onClick={() => { if (!disabled) { setStep(key); if (key !== "creatives") setSelectedCampaign(null); } }}
                disabled={disabled}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  active ? "bg-violet-600 text-white shadow-sm" : disabled ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
                {idx < STEPS.length - 1 && !active && <ChevronRight className="w-3 h-3 text-gray-300 ml-1 hidden sm:block" />}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {step === "brand" && (
            <BrandFoundationStep companySlug={companySlug} onNext={() => setStep("campaigns")} />
          )}
          {(step === "campaigns" || step === "campaign-detail") && !selectedCampaign && (
            <CampaignsStep companySlug={companySlug} brandSuficiency={brandSuficiency}
              onCreatives={c => { setSelectedCampaign(c); setStep("creatives"); }}
              onBack={() => setStep("brand")} />
          )}
          {step === "creatives" && selectedCampaign && (
            <CreativeSystemStep campaign={selectedCampaign} companySlug={companySlug}
              onBack={() => { setStep("campaigns"); setSelectedCampaign(null); }} />
          )}
        </div>
      </div>
    </div>
  );
}
