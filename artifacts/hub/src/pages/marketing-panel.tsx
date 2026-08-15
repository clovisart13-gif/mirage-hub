import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useSearch } from "wouter";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Calendar, Video, Image, AlignLeft, ArrowLeft,
  ChevronDown, ChevronUp, Loader2, AlertCircle, BarChart3,
  CheckCircle2, XCircle, RefreshCw, Clock, MessageSquare,
  ThumbsUp, ThumbsDown, RotateCcw, Megaphone, Sparkles,
  ImageIcon, ExternalLink, Send, Instagram, Building2,
  TrendingUp, Eye, Heart, Bookmark, Share2, Monitor, Trash2,
  Download, Copy, SmilePlus, MoreHorizontal, Upload, FolderOpen,
  ChevronRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TenantAsset {
  id: string;
  companySlug: string;
  filename: string;
  storagePath: string;
  mimetype: string;
  sizeBytes: number | null;
  createdAt: string;
}

interface ContentItem {
  id: string;
  companySlug: string;
  campaignId: string;
  contentType: string;
  title: string | null;
  hook: string | null;
  caption: string | null;
  cta: string | null;
  funnelStage: string | null;
  scheduledDay: number | null;
  scheduledDate: string | null;
  scriptJson: Record<string, unknown> | null;
  imagePrompt: string | null;
  status: "pending" | "approved" | "rejected" | "revision_requested";
  statusNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface Campaign {
  campaignId: string;
  companySlug: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  revision_requested: number;
  createdAt: string;
}

interface CampaignAsset {
  id: string;
  companySlug: string;
  campaignId: string;
  contentItemId: string | null;
  assetType: string;
  storagePath: string;
  promptUsed: string | null;
  status: string;
  createdAt: string;
}

interface CampaignMetricsTotals {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  profileVisits: number;
  linkClicks: number;
  directMessages: number;
  leadsGenerated: number;
  engagementRate: number;
}

interface CampaignMetricRow {
  id: string;
  companySlug: string;
  campaignId: string;
  publicationId: string | null;
  channel: string;
  externalPostId: string | null;
  metricDate: string;
  impressions: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  profileVisits: number | null;
  linkClicks: number | null;
  directMessages: number | null;
  leadsGenerated: number | null;
  createdAt: string;
}

interface CampaignPublication {
  id: string;
  companySlug: string;
  campaignId: string;
  contentItemId: string | null;
  assetId: string | null;
  channel: string;
  caption: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  status: string;
  externalPostId: string | null;
  externalAccountId: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface AssetThumbnail {
  id: string;
  campaignId: string;
  companySlug: string;
  storagePath: string;
  assetType: string;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(v);
}

function imgUrl(storagePath: string) {
  return `/api/storage${storagePath}`;
}

function assetAspect(assetType: string) {
  if (assetType === "story_frame") return "aspect-[9/16]";
  return "aspect-square";
}

const TYPE_CFG: Record<string, { label: string; Icon: typeof Video; color: string; bg: string; border: string }> = {
  feed_post:    { label: "Post Feed",  Icon: Image,     color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200" },
  video_script: { label: "Vídeo",     Icon: Video,     color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  carousel:     { label: "Carrossel", Icon: AlignLeft, color: "text-teal-600",   bg: "bg-teal-50",   border: "border-teal-200" },
};

const FUNNEL_CFG: Record<string, { label: string; cls: string }> = {
  awareness:     { label: "Topo",  cls: "bg-sky-100 text-sky-700" },
  consideration: { label: "Meio",  cls: "bg-amber-100 text-amber-700" },
  conversion:    { label: "Fundo", cls: "bg-rose-100 text-rose-700" },
};

const STATUS_CFG: Record<string, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  pending:            { label: "Aguardando revisão", icon: Clock,        cls: "bg-gray-100 text-gray-600" },
  approved:           { label: "Aprovado",           icon: CheckCircle2, cls: "bg-green-100 text-green-700" },
  rejected:           { label: "Reprovado",          icon: XCircle,      cls: "bg-red-100 text-red-600" },
  revision_requested: { label: "Pedir revisão",      icon: RefreshCw,    cls: "bg-amber-100 text-amber-700" },
};

const PUB_STATUS_CFG: Record<string, { label: string; cls: string; dot: string }> = {
  scheduled:  { label: "Agendado",  cls: "bg-blue-50 text-blue-700",   dot: "bg-blue-500" },
  published:  { label: "Publicado", cls: "bg-green-50 text-green-700", dot: "bg-green-500" },
  failed:     { label: "Falhou",    cls: "bg-red-50 text-red-700",     dot: "bg-red-500" },
  cancelled:  { label: "Cancelado", cls: "bg-gray-100 text-gray-500",  dot: "bg-gray-400" },
};

// ── Review Modal ──────────────────────────────────────────────────────────────

function ReviewModal({
  item, action, onClose, onConfirm, loading,
}: {
  item: ContentItem;
  action: "approved" | "rejected" | "revision_requested";
  onClose: () => void;
  onConfirm: (note: string) => void;
  loading: boolean;
}) {
  const [note, setNote] = useState("");
  const needsNote = action !== "approved";
  const labels = {
    approved:           { title: "Aprovar conteúdo",   btn: "Confirmar aprovação", btnCls: "bg-green-600 hover:bg-green-700 text-white" },
    rejected:           { title: "Reprovar conteúdo",  btn: "Confirmar reprovação", btnCls: "bg-red-600 hover:bg-red-700 text-white" },
    revision_requested: { title: "Pedir revisão",      btn: "Enviar pedido",        btnCls: "bg-amber-600 hover:bg-amber-700 text-white" },
  };
  const cfg = labels[action];
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{cfg.title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-gray-600"><span className="font-medium">{item.title || "Sem título"}</span></p>
          {needsNote && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                {action === "rejected" ? "Motivo da reprovação" : "O que precisa ser ajustado?"}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={action === "rejected" ? "Ex: Tom não está alinhado com nossa marca..." : "Ex: Ajustar o hook para ser mais direto..."}
                rows={3} className="text-sm" />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button className={cfg.btnCls} onClick={() => onConfirm(note)}
            disabled={loading || (needsNote && !note.trim())}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {cfg.btn}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Publish Modal ─────────────────────────────────────────────────────────────

interface InstagramAccount {
  page_id: string;
  page_name: string;
  instagram_account_id: string;
  instagram_name: string | null;
  instagram_username: string | null;
}

function PublishModal({
  item, onClose, onConfirm, loading, initialImageUrl, companySlug,
}: {
  item: ContentItem;
  onClose: () => void;
  onConfirm: (data: { imageUrl: string; publishMode: "immediate" | "scheduled"; scheduledAt: string | null }) => void;
  loading: boolean;
  initialImageUrl?: string;
  companySlug?: string | null;
}) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl ?? "");
  const [publishMode, setPublishMode] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledAt, setScheduledAt] = useState("");

  const slug = companySlug ?? item.companySlug ?? "";

  const { data: igAccount, isLoading: isLoadingIg, error: igError } = useQuery<{
    account_id: string; username: string | null; name: string | null; company_slug: string;
  }>({
    queryKey: ["instagram-account", slug],
    queryFn: () => apiFetch(`/marketing/instagram-account?company_slug=${encodeURIComponent(slug)}`),
    enabled: !!slug,
    staleTime: 60_000,
    retry: false,
  });

  const igNotConfigured = !isLoadingIg && (igError || !igAccount);
  const canSubmit = !igNotConfigured && imageUrl.trim() &&
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
          {/* Preview da legenda */}
          <div className="rounded-xl bg-gray-50 border p-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Legenda do post</p>
            <p className="text-sm text-gray-700 line-clamp-4 whitespace-pre-wrap leading-relaxed">
              {item.caption || item.hook || "Sem legenda definida"}
            </p>
          </div>

          {/* Conta Instagram — resolvida automaticamente pelo company_slug */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
              Conta Instagram
            </label>

            {isLoadingIg && (
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando conta vinculada à campanha…
              </div>
            )}

            {igNotConfigured && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-700 space-y-1">
                <p className="font-semibold">Conta Instagram não configurada para "{slug}"</p>
                <p className="text-xs text-amber-600">Peça ao ATHOS para cadastrar a chave <code className="bg-amber-100 px-1 rounded">instagram_account_id_{slug}</code> em Mentor → Configurações.</p>
              </div>
            )}

            {igAccount && (
              <div className="flex items-center gap-3 rounded-xl border border-pink-300 bg-pink-50 px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                  <Instagram className="w-4 h-4 text-pink-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {igAccount.name ?? slug}
                  </p>
                  {igAccount.username && (
                    <p className="text-[11px] text-gray-500">@{igAccount.username}</p>
                  )}
                </div>
                <CheckCircle2 className="w-4 h-4 text-pink-500 flex-shrink-0" />
              </div>
            )}
          </div>

          {/* URL da imagem */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
              URL da imagem <span className="text-red-500">*</span>
            </label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://cdn.exemplo.com/imagem.jpg"
              className="text-sm"
            />
            <p className="text-[11px] text-gray-400 mt-1">URL pública acessível pela Graph API da Meta</p>
            {imageUrl.trim() && (
              <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 relative">
                <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 pt-1.5">Prévia da imagem que será publicada</p>
                <img
                  src={imageUrl.trim()}
                  alt="Prévia"
                  className="w-full max-h-48 object-contain p-2"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
          </div>

          {/* Modo de publicação */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Modo de publicação</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPublishMode("immediate")}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                  publishMode === "immediate"
                    ? "border-violet-400 bg-violet-50 text-violet-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                Publicar agora
              </button>
              <button
                type="button"
                onClick={() => setPublishMode("scheduled")}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                  publishMode === "scheduled"
                    ? "border-violet-400 bg-violet-50 text-violet-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                Agendar
              </button>
            </div>
          </div>

          {/* Data/hora se agendado */}
          {publishMode === "scheduled" && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                Data e hora <span className="text-red-500">*</span>
              </label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="text-sm"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 gap-2"
            disabled={loading || !canSubmit}
            onClick={() =>
              onConfirm({
                imageUrl: imageUrl.trim(),
                publishMode,
                scheduledAt: publishMode === "scheduled" ? new Date(scheduledAt).toISOString() : null,
              })
            }
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Send className="w-4 h-4" />
            {publishMode === "immediate" ? "Publicar agora" : "Agendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Instagram Preview Modal (A + B) ───────────────────────────────────────────

async function downloadBlob(url: string, filename: string) {
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

function InstagramPreviewModal({
  item, asset, companySlug, onClose,
}: {
  item: ContentItem;
  asset: CampaignAsset;
  companySlug?: string | null;
  onClose: () => void;
}) {
  const caption = item.caption || item.hook || "";
  const username = companySlug ?? item.companySlug ?? "mirage";
  const imageFullUrl = `${window.location.origin}${imgUrl(asset.storagePath)}`;
  const filename = `post-${item.id.slice(0, 8)}.jpg`;

  function copyCaption() {
    navigator.clipboard.writeText(caption)
      .then(() => toast.success("Legenda copiada!"))
      .catch(() => toast.error("Erro ao copiar"));
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-2xl">
        {/* Instagram-style header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 flex items-center justify-center">
              <Instagram className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900 leading-none">@{username}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Mirage Hub</p>
            </div>
          </div>
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </div>

        {/* Image */}
        <div className="aspect-square w-full bg-gray-100 overflow-hidden">
          <img
            src={imageFullUrl}
            alt="Post"
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
          />
        </div>

        {/* Action bar */}
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Heart className="w-6 h-6 text-gray-700" />
            <MessageSquare className="w-6 h-6 text-gray-700" />
            <Share2 className="w-6 h-6 text-gray-700" />
          </div>
          <Bookmark className="w-6 h-6 text-gray-700" />
        </div>

        {/* Caption */}
        <div className="px-3 pb-3 space-y-1.5">
          <p className="text-[13px] text-gray-800 leading-relaxed">
            <span className="font-semibold">@{username}</span>{" "}
            <span className="whitespace-pre-wrap">{caption || <span className="text-gray-400 italic">Sem legenda definida</span>}</span>
          </p>
          {item.cta && (
            <p className="text-[12px] font-semibold text-violet-600">{item.cta}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="border-t border-gray-100 px-3 py-3 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-9 text-xs gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50"
            onClick={copyCaption}
            disabled={!caption}
          >
            <Copy className="w-3.5 h-3.5" />
            Copiar legenda
          </Button>
          <Button
            size="sm"
            className="flex-1 h-9 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => downloadBlob(imageFullUrl, filename)}
          >
            <Download className="w-3.5 h-3.5" />
            Baixar imagem
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Content Card ──────────────────────────────────────────────────────────────

type BrandingVariant = "auto" | "color" | "white" | "black";

const BRANDING_OPTS: { value: BrandingVariant; label: string; title: string }[] = [
  { value: "auto",  label: "Auto",   title: "Detecta automaticamente pelo brilho da imagem" },
  { value: "color", label: "Color",  title: "Logo colorida + rodapé escuro" },
  { value: "white", label: "Branco", title: "Logo e rodapé totalmente brancos (para fundos escuros)" },
  { value: "black", label: "Preto",  title: "Logo e rodapé totalmente pretos (para fundos claros)" },
];

const SCREEN_GROUPS = [
  { group: "Hub Mirage — Módulos (composites com branding)", screens: [
    { key: "hub-kanban",     label: "Kanban de Produção" },
    { key: "hub-plm",        label: "PLM" },
    { key: "hub-custos",     label: "Custos e Orçamentos" },
    { key: "hub-relatorios", label: "Relatórios" },
  ]},
  { group: "Hub Mirage (screenshots reais)", screens: [
    { key: "hub-central",  label: "Central" },
    { key: "hub-comecar",  label: "Começar" },
    { key: "hub-home",     label: "Home" },
    { key: "hub-planos",   label: "Planos" },
  ]},
  { group: "CRM Helena (screenshots reais)", screens: [
    { key: "crm-pipeline",   label: "Pipeline" },
    { key: "crm-chat",       label: "Chat" },
    { key: "crm-relatorios", label: "Relatórios" },
  ]},
  { group: "ERP Mirage (screenshots reais)", screens: [
    { key: "erp-dashboard",   label: "Dashboard" },
    { key: "erp-estoque",     label: "Estoque" },
    { key: "erp-integracoes", label: "Integrações" },
  ]},
  { group: "Moda Conecta (screenshots reais)", screens: [
    { key: "mc-form",        label: "Fase Fundadora" },
    { key: "mc-form-mobile", label: "Mobile — Fase Fundadora" },
    { key: "mc-beneficios",  label: "Hero + Benefícios + Form" },
  ]},
];

function ContentCard({ item, onReview, onPublish, onGenerateImage, generatingImageFor, existingAsset, onUseRealScreen, usingRealScreenFor, onPreview, onPickFromLibrary }: {
  item: ContentItem;
  onReview: (item: ContentItem, action: "approved" | "rejected" | "revision_requested") => void;
  onPublish?: (item: ContentItem) => void;
  onGenerateImage?: (item: ContentItem, variant: BrandingVariant) => void;
  generatingImageFor?: string | null;
  existingAsset?: CampaignAsset | null;
  onUseRealScreen?: (item: ContentItem, screenKey: string) => void;
  usingRealScreenFor?: string | null;
  onPreview?: (item: ContentItem, asset: CampaignAsset) => void;
  onPickFromLibrary?: (item: ContentItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [brandingVariant, setBrandingVariant] = useState<BrandingVariant>("auto");
  const [showScreenPicker, setShowScreenPicker] = useState(false);
  const type = TYPE_CFG[item.contentType] ?? TYPE_CFG.feed_post;
  const funnel = item.funnelStage ? FUNNEL_CFG[item.funnelStage] : null;
  const status = STATUS_CFG[item.status] ?? STATUS_CFG.pending;
  const StatusIcon = status.icon;
  const TypeIcon = type.Icon;
  const isPending = item.status === "pending" || item.status === "revision_requested";
  const isApproved = item.status === "approved";
  const isGenerating = generatingImageFor === item.id;
  const hasImage = !!existingAsset;

  return (
    <div className={`rounded-xl border ${type.border} ${type.bg} transition-all`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/70 flex items-center justify-center shrink-0 mt-0.5">
            <TypeIcon className={`w-4 h-4 ${type.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${type.color}`}>{type.label}</span>
              {funnel && <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 border-0 ${funnel.cls}`}>{funnel.label}</Badge>}
              {item.scheduledDay && (
                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                  <Calendar className="w-2.5 h-2.5" /> Dia {item.scheduledDay}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-800 leading-snug">{item.title || "Sem título"}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${status.cls}`}>
              <StatusIcon className="w-3 h-3" />{status.label}
            </span>
            <button onClick={() => setExpanded(!expanded)} className="p-1 rounded hover:bg-black/5">
              {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
        </div>
        {item.hook && <p className="mt-2 ml-12 text-sm text-gray-700 italic leading-snug">"{item.hook}"</p>}
        {item.statusNote && (
          <div className="mt-2 ml-12 flex items-start gap-1.5 bg-white/60 rounded-lg p-2">
            <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-600">{item.statusNote}</p>
          </div>
        )}
        {expanded && (
          <div className="mt-3 ml-12 space-y-3 border-t border-black/10 pt-3">
            {item.caption && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Legenda</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{item.caption}</p>
              </div>
            )}
            {item.cta && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">CTA</p>
                <p className="text-sm text-gray-800 font-medium">{item.cta}</p>
              </div>
            )}
            {item.imagePrompt && (
              <div className="bg-violet-50 rounded-lg p-2.5 border border-violet-100">
                <p className="text-[10px] font-semibold text-violet-500 uppercase mb-1 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Prompt Visual (IA)
                </p>
                <p className="text-xs text-violet-700 leading-relaxed">{item.imagePrompt}</p>
              </div>
            )}
            {item.contentType === "video_script" && item.scriptJson && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Roteiro</p>
                <div className="bg-white/60 rounded-lg p-3 space-y-2 text-sm">
                  {(item.scriptJson.duration as string) && <p className="text-xs text-gray-500">⏱ {item.scriptJson.duration as string}</p>}
                  {(item.scriptJson.narration as string) && <p className="text-gray-700 italic">{item.scriptJson.narration as string}</p>}
                  {Array.isArray(item.scriptJson.scenes) && (
                    <ol className="list-decimal list-inside space-y-0.5">
                      {(item.scriptJson.scenes as unknown[]).map((s, i) => (
                        <li key={i} className="text-xs text-gray-600">{typeof s === "string" ? s : JSON.stringify(s)}</li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {(isPending || isApproved) && (
        <div className="px-4 pb-3 space-y-2 border-t border-black/10 pt-3">
          {/* Miniatura da imagem gerada + botão IA */}
          {onGenerateImage && (
            <div className="space-y-1.5">
              {hasImage && existingAsset && (
                <div className="flex items-center gap-2 bg-white/70 rounded-lg px-2 py-1.5 border border-green-200">
                  <img
                    src={imgUrl(existingAsset.storagePath)}
                    alt="Imagem gerada"
                    className="w-10 h-10 rounded object-cover shrink-0 border border-green-100"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-green-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Imagem vinculada
                    </p>
                    {existingAsset.promptUsed && (
                      <p className="text-[10px] text-gray-400 line-clamp-1">{existingAsset.promptUsed.slice(0, 80)}…</p>
                    )}
                  </div>
                </div>
              )}
              {/* Seletor de variante de branding */}
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] text-gray-400 mr-0.5">Branding:</span>
                {BRANDING_OPTS.map(opt => (
                  <button
                    key={opt.value}
                    title={opt.title}
                    onClick={() => setBrandingVariant(opt.value)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                      brandingVariant === opt.value
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-white text-gray-500 border-gray-200 hover:border-violet-300 hover:text-violet-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-7 text-xs gap-1.5 flex-1 disabled:opacity-60 ${hasImage ? "border-gray-200 text-gray-500 hover:bg-gray-50" : "border-violet-300 text-violet-700 hover:bg-violet-50"}`}
                  disabled={isGenerating || usingRealScreenFor === item.id}
                  onClick={() => onGenerateImage(item, brandingVariant)}
                >
                  {isGenerating
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> IA…</>
                    : hasImage
                      ? <><RefreshCw className="w-3 h-3" /> Regenerar IA</>
                      : <><Sparkles className="w-3 h-3" /> Gerar com IA</>}
                </Button>
                {onUseRealScreen && (
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-7 text-xs gap-1 shrink-0 disabled:opacity-60 ${showScreenPicker ? "bg-teal-50 border-teal-400 text-teal-700" : "border-teal-300 text-teal-700 hover:bg-teal-50"}`}
                    disabled={isGenerating || usingRealScreenFor === item.id}
                    onClick={() => setShowScreenPicker(v => !v)}
                  >
                    {usingRealScreenFor === item.id
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Aplicando…</>
                      : <><Monitor className="w-3 h-3" /> Tela real</>}
                  </Button>
                )}
                {onPickFromLibrary && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 shrink-0 border-orange-300 text-orange-700 hover:bg-orange-50"
                    disabled={isGenerating}
                    onClick={() => onPickFromLibrary(item)}
                  >
                    <FolderOpen className="w-3 h-3" /> Da galeria
                  </Button>
                )}
              </div>
              {showScreenPicker && onUseRealScreen && (
                <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-2.5 space-y-3 max-h-72 overflow-y-auto">
                  {SCREEN_GROUPS.map(({ group, screens }) => (
                    <div key={group}>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{group}</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {screens.map(({ key, label }) => (
                          <button
                            key={key}
                            disabled={usingRealScreenFor === item.id}
                            onClick={() => { onUseRealScreen(item, key); setShowScreenPicker(false); }}
                            className="group flex flex-col rounded-lg border border-gray-200 bg-white overflow-hidden hover:border-teal-400 hover:shadow-md transition-all disabled:opacity-40 text-left"
                          >
                            <div className="w-full h-14 bg-gray-100 overflow-hidden relative">
                              <img
                                src={`/api/marketing/screen-preview/${key}`}
                                alt={label}
                                className="w-full h-full object-cover object-top"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                              />
                              <div className="absolute inset-0 bg-teal-500/0 group-hover:bg-teal-500/10 transition-colors" />
                            </div>
                            <p className="text-[9px] text-gray-600 group-hover:text-teal-800 px-1.5 py-1 leading-tight font-medium">{label}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            {isPending && (
              <>
                <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white gap-1.5 flex-1" onClick={() => onReview(item, "approved")}>
                  <ThumbsUp className="w-3 h-3" /> Aprovar
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 flex-1 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => onReview(item, "revision_requested")}>
                  <RotateCcw className="w-3 h-3" /> Revisar
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-red-300 text-red-600 hover:bg-red-50" onClick={() => onReview(item, "rejected")}>
                  <ThumbsDown className="w-3 h-3" />
                </Button>
              </>
            )}
            {isApproved && onPublish && (
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5 flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0"
                onClick={() => onPublish(item)}
              >
                <Instagram className="w-3 h-3" /> Publicar no Instagram
              </Button>
            )}
          </div>
          {hasImage && existingAsset && onPreview && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-xs gap-1.5 border-pink-200 text-pink-600 hover:bg-pink-50"
              onClick={() => onPreview(item, existingAsset)}
            >
              <Eye className="w-3 h-3" />
              Preview Instagram · Copiar legenda · Baixar imagem
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Layer 3: Assets Tab ───────────────────────────────────────────────────────

function HubGenerateButton({ campaignId, companySlug, onGenerated }: {
  campaignId: string;
  companySlug?: string | null;
  onGenerated: () => void;
}) {
  const [loadingHub, setLoadingHub] = useState(false);
  const [loadingMockup, setLoadingMockup] = useState(false);

  const handleGenerateHub = async () => {
    setLoadingHub(true);
    try {
      const data: { count: number } = await apiFetch("/marketing/assets/generate-hub-screens", {
        method: "POST",
        body: JSON.stringify({ company_slug: companySlug ?? "mirage", campaign_id: campaignId }),
      });
      toast.success(`${data.count} imagens do Hub geradas com branding Mirage!`);
      onGenerated();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setLoadingHub(false);
    }
  };

  const handleGenerateMockup = async () => {
    setLoadingMockup(true);
    try {
      const data: { count: number } = await apiFetch("/marketing/assets/generate-mockup-screens", {
        method: "POST",
        body: JSON.stringify({ company_slug: companySlug ?? "mirage", campaign_id: campaignId }),
      });
      toast.success(`${data.count} telas CRM/ERP adicionadas à campanha!`);
      onGenerated();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setLoadingMockup(false);
    }
  };

  return (
    <div className="mb-5 space-y-2">
      <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">Telas reais do Hub</p>
          <p className="text-xs text-gray-500 mt-0.5">5 capturas automáticas (Dashboard, Kanban, PLM, Conecta Moda, Relatórios) + branding Mirage.</p>
        </div>
        <Button
          size="sm"
          onClick={handleGenerateHub}
          disabled={loadingHub || loadingMockup}
          className="shrink-0 bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
        >
          {loadingHub ? <><Loader2 className="w-3 h-3 animate-spin" /> Gerando…</> : <><Sparkles className="w-3 h-3" /> Gerar</>}
        </Button>
      </div>

      <div className="rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50 p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
          <Monitor className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">Telas CRM/ERP do ecossistema</p>
          <p className="text-xs text-gray-500 mt-0.5">6 screenshots reais: Pipeline, Chat, Relatórios (CRM) + Dashboard, Estoque, Integrações (ERP).</p>
        </div>
        <Button
          size="sm"
          onClick={handleGenerateMockup}
          disabled={loadingHub || loadingMockup}
          className="shrink-0 bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
        >
          {loadingMockup ? <><Loader2 className="w-3 h-3 animate-spin" /> Gerando…</> : <><Monitor className="w-3 h-3" /> Gerar</>}
        </Button>
      </div>
    </div>
  );
}

function AssetsTab({ campaignId, companySlug, isMirage }: { campaignId: string; companySlug?: string | null; isMirage?: boolean }) {
  const queryClient = useQueryClient();
  const uploadRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery<{ ok: boolean; total: number; assets: CampaignAsset[] }>({
    queryKey: ["campaign-assets", campaignId, companySlug],
    queryFn: () => {
      const p = new URLSearchParams();
      if (companySlug) p.set("company_slug", companySlug);
      return apiFetch(`/marketing/assets/campaign/${campaignId}${p.toString() ? `?${p}` : ""}`);
    },
    enabled: !!campaignId,
  });

  const { data: libraryData, isLoading: libraryLoading } = useQuery<{ ok: boolean; total: number; assets: TenantAsset[] }>({
    queryKey: ["tenant-library", companySlug],
    queryFn: () => {
      const p = new URLSearchParams();
      if (companySlug) p.set("company_slug", companySlug);
      return apiFetch(`/marketing/library${p.toString() ? `?${p}` : ""}`);
    },
    enabled: !!companySlug,
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["campaign-assets", campaignId, companySlug] });
  const refetchLibrary = () => queryClient.invalidateQueries({ queryKey: ["tenant-library", companySlug] });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const reader = new FileReader();
      const data_base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await apiFetch("/marketing/library/upload", {
        method: "POST",
        body: JSON.stringify({
          company_slug: companySlug ?? "mirage",
          filename: file.name,
          data_base64,
          mimetype: file.type || "image/jpeg",
        }),
      });
      toast.success("Imagem enviada para a biblioteca!");
      refetchLibrary();
    } catch (err: any) {
      toast.error(`Erro no upload: ${err.message}`);
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>;

  const assets = data?.assets ?? [];
  const libraryAssets = libraryData?.assets ?? [];

  const ASSET_TYPE_LABEL: Record<string, string> = {
    feed_image:     "Feed",
    story_frame:    "Story",
    carousel_slide: "Carrossel",
    video_thumb:    "Thumbnail",
  };

  return (
    <div className="space-y-8">
      {/* Assets gerados por IA vinculados à campanha */}
      <div>
        {isMirage && (
          <HubGenerateButton campaignId={campaignId} companySlug={companySlug} onGenerated={refetch} />
        )}

        {assets.length === 0 ? (
          <div className="py-10 text-center">
            <ImageIcon className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400 font-medium">Nenhum asset de campanha ainda</p>
            <p className="text-sm text-gray-300 mt-1">Gere imagens por IA nos itens de conteúdo ou use a biblioteca abaixo</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{assets.length} asset{assets.length !== 1 ? "s" : ""} de campanha</p>
              <div className="flex gap-2 text-xs text-gray-400">
                {Array.from(new Set(assets.map(a => a.assetType))).map(t => (
                  <span key={t} className="bg-gray-100 px-2 py-0.5 rounded-full">{ASSET_TYPE_LABEL[t] ?? t}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {assets.map((asset) => (
                <div key={asset.id} className="group relative rounded-2xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-lg transition-all">
                  <div className={`relative w-full ${assetAspect(asset.assetType)} overflow-hidden`}>
                    <img src={imgUrl(asset.storagePath)} alt={asset.assetType} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                      <p className="text-white text-xs font-semibold">{ASSET_TYPE_LABEL[asset.assetType] ?? asset.assetType}</p>
                      {asset.promptUsed && <p className="text-white/70 text-[10px] mt-0.5 line-clamp-2">{asset.promptUsed}</p>}
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
                      <a href={imgUrl(asset.storagePath)} target="_blank" rel="noopener noreferrer" className="bg-white/90 backdrop-blur rounded-lg p-1.5 shadow hover:bg-white transition-colors">
                        <ExternalLink className="w-3 h-3 text-gray-700" />
                      </a>
                      <button onClick={() => { if (!confirm("Excluir este asset?")) return; apiFetch(`/marketing/assets/${asset.id}`, { method: "DELETE" }).then(() => { toast.success("Asset excluído"); refetch(); }).catch((e: Error) => toast.error(`Erro: ${e.message}`)); }} className="bg-white/90 backdrop-blur rounded-lg p-1.5 shadow hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <div className="px-2 py-1.5">
                    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${asset.assetType === "story_frame" ? "bg-pink-50 text-pink-600" : asset.assetType === "carousel_slide" ? "bg-teal-50 text-teal-600" : "bg-violet-50 text-violet-600"}`}>{ASSET_TYPE_LABEL[asset.assetType] ?? asset.assetType}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Biblioteca de uploads do tenant */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-orange-500" /> Biblioteca de imagens
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Imagens enviadas via upload — disponíveis para qualquer campanha deste tenant</p>
          </div>
          <div>
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
            />
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
              disabled={uploading}
              onClick={() => uploadRef.current?.click()}
            >
              {uploading ? <><Loader2 className="w-3 h-3 animate-spin" /> Enviando…</> : <><Upload className="w-3 h-3" /> Upload</>}
            </Button>
          </div>
        </div>

        {libraryLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
        ) : libraryAssets.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-2xl">
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-gray-400 text-sm font-medium">Biblioteca vazia</p>
            <p className="text-gray-300 text-xs mt-1">Clique em "Upload" para adicionar imagens</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {libraryAssets.map((asset) => (
              <div key={asset.id} className="group relative rounded-2xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-lg transition-all">
                <div className="relative w-full aspect-square overflow-hidden">
                  <img src={imgUrl(asset.storagePath)} alt={asset.filename} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
                    <a href={imgUrl(asset.storagePath)} target="_blank" rel="noopener noreferrer" className="bg-white/90 backdrop-blur rounded-lg p-1.5 shadow hover:bg-white transition-colors">
                      <ExternalLink className="w-3 h-3 text-gray-700" />
                    </a>
                    <button onClick={() => { if (!confirm("Excluir da biblioteca?")) return; apiFetch(`/marketing/library/${asset.id}`, { method: "DELETE" }).then(() => { toast.success("Removido da biblioteca"); refetchLibrary(); }).catch((e: Error) => toast.error(`Erro: ${e.message}`)); }} className="bg-white/90 backdrop-blur rounded-lg p-1.5 shadow hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                </div>
                <div className="px-2 py-1.5">
                  <p className="text-[10px] text-gray-500 truncate">{asset.filename}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Layer 3: Publications Tab ─────────────────────────────────────────────────

function PublicationsTab({ campaignId, companySlug }: { campaignId: string; companySlug?: string | null }) {
  const { data, isLoading } = useQuery<{ ok: boolean; total: number; publications: CampaignPublication[] }>({
    queryKey: ["campaign-publications", campaignId, companySlug],
    queryFn: () => {
      const p = new URLSearchParams();
      if (companySlug) p.set("company_slug", companySlug);
      return apiFetch(`/marketing/publications/campaign/${campaignId}${p.toString() ? `?${p}` : ""}`);
    },
    enabled: !!campaignId,
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>;

  const pubs = data?.publications ?? [];

  if (pubs.length === 0) {
    return (
      <div className="py-16 text-center">
        <Send className="w-12 h-12 mx-auto mb-3 text-gray-200" />
        <p className="text-gray-400 font-medium">Nenhuma publicação registrada</p>
        <p className="text-sm text-gray-300 mt-1">As publicações agendadas pelo ATHOS aparecerão aqui</p>
      </div>
    );
  }

  const summary = {
    published: pubs.filter(p => p.status === "published").length,
    scheduled: pubs.filter(p => p.status === "scheduled").length,
    failed: pubs.filter(p => p.status === "failed").length,
  };

  return (
    <div>
      <div className="flex gap-3 mb-4">
        {summary.published > 0 && (
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-xl px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-semibold text-green-700">{summary.published} publicado{summary.published !== 1 ? "s" : ""}</span>
          </div>
        )}
        {summary.scheduled > 0 && (
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold text-blue-700">{summary.scheduled} agendado{summary.scheduled !== 1 ? "s" : ""}</span>
          </div>
        )}
        {summary.failed > 0 && (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-xl px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs font-semibold text-red-700">{summary.failed} falhou{summary.failed !== 1 ? "m" : ""}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {pubs.map((pub) => {
          const cfg = PUB_STATUS_CFG[pub.status] ?? PUB_STATUS_CFG.scheduled;
          const dateStr = pub.publishedAt
            ? new Date(pub.publishedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
            : pub.scheduledAt
            ? new Date(pub.scheduledAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
            : "—";
          return (
            <div key={pub.id} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
                <Instagram className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                {pub.caption && <p className="text-sm text-gray-700 line-clamp-2 mb-1">{pub.caption}</p>}
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {pub.publishedAt ? "Publicado em" : "Agendado para"} {dateStr}
                  </span>
                  {pub.externalAccountId && <span className="text-violet-500 font-medium">@{pub.externalAccountId}</span>}
                  {pub.externalPostId && <span className="font-mono text-gray-300 truncate">#{pub.externalPostId.slice(0, 12)}…</span>}
                </div>
                {pub.errorMessage && (
                  <div className="mt-1.5 flex items-start gap-1 text-red-500">
                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    <p className="text-[11px]">{pub.errorMessage}</p>
                  </div>
                )}
              </div>
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${cfg.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Layer 3: Performance Tab ──────────────────────────────────────────────────

const METRIC_KPIS: { key: keyof CampaignMetricsTotals; label: string; Icon: typeof Eye; color: string; bg: string }[] = [
  { key: "impressions",    label: "Impressões",     Icon: Eye,       color: "text-violet-600", bg: "bg-violet-50" },
  { key: "reach",          label: "Alcance",        Icon: TrendingUp, color: "text-blue-600",  bg: "bg-blue-50" },
  { key: "likes",          label: "Curtidas",       Icon: Heart,     color: "text-pink-500",   bg: "bg-pink-50" },
  { key: "comments",       label: "Comentários",    Icon: MessageSquare, color: "text-yellow-600", bg: "bg-yellow-50" },
  { key: "shares",         label: "Compartilhados", Icon: Share2,    color: "text-green-600",  bg: "bg-green-50" },
  { key: "saves",          label: "Salvos",         Icon: Bookmark,  color: "text-indigo-600", bg: "bg-indigo-50" },
  { key: "leadsGenerated", label: "Leads",          Icon: CheckCircle2, color: "text-red-600", bg: "bg-red-50" },
  { key: "engagementRate", label: "Engajamento",    Icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
];

function PerformanceTab({ campaignId, companySlug }: { campaignId: string; companySlug?: string | null }) {
  const { data, isLoading } = useQuery<{ ok: boolean; total: number; totals: CampaignMetricsTotals; metrics: CampaignMetricRow[] }>({
    queryKey: ["campaign-metrics", campaignId, companySlug],
    queryFn: () => {
      const p = new URLSearchParams();
      if (companySlug) p.set("company_slug", companySlug);
      return apiFetch(`/marketing/metrics/campaign/${campaignId}${p.toString() ? `?${p}` : ""}`);
    },
    enabled: !!campaignId,
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>;

  const metrics = data?.metrics ?? [];
  const totals = data?.totals ?? {
    impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0,
    saves: 0, profileVisits: 0, linkClicks: 0, directMessages: 0,
    leadsGenerated: 0, engagementRate: 0,
  };

  if (metrics.length === 0) {
    return (
      <div className="py-16 text-center">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-200" />
        <p className="text-gray-400 font-medium">Nenhuma métrica registrada</p>
        <p className="text-sm text-gray-300 mt-1">Os dados do Instagram aparecerão aqui após a conexão com a Meta API</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {METRIC_KPIS.map(({ key, label, Icon, color, bg }) => (
          <div key={key} className={`rounded-2xl border border-gray-100 p-4 ${bg} text-center shadow-sm`}>
            <div className={`w-8 h-8 rounded-xl bg-white flex items-center justify-center mx-auto mb-2 shadow-sm`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`text-xl font-bold ${color}`}>
              {key === "engagementRate" ? `${totals.engagementRate}%` : fmt(totals[key] as number)}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {metrics.length > 1 && (
        <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Histórico por data</p>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-white text-gray-500 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5">Data</th>
                <th className="text-right px-3 py-2.5">Impr.</th>
                <th className="text-right px-3 py-2.5">Alcance</th>
                <th className="text-right px-3 py-2.5">❤️</th>
                <th className="text-right px-3 py-2.5">💬</th>
                <th className="text-right px-3 py-2.5">🔖</th>
                <th className="text-right px-4 py-2.5">🎯 Leads</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => (
                <tr key={m.id} className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                  <td className="px-4 py-2.5 font-medium text-gray-700">{new Date(m.metricDate).toLocaleDateString("pt-BR")}</td>
                  <td className="px-3 py-2.5 text-right text-gray-600">{fmt(m.impressions)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-600">{fmt(m.reach)}</td>
                  <td className="px-3 py-2.5 text-right text-pink-600 font-medium">{fmt(m.likes)}</td>
                  <td className="px-3 py-2.5 text-right text-yellow-600">{fmt(m.comments)}</td>
                  <td className="px-3 py-2.5 text-right text-indigo-600">{fmt(m.saves)}</td>
                  <td className="px-4 py-2.5 text-right text-red-600 font-semibold">{fmt(m.leadsGenerated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Layer 3: Content Tab ──────────────────────────────────────────────────────

function ContentTab({ campaignId, companySlug, isMirage }: { campaignId: string; companySlug?: string | null; isMirage?: boolean }) {
  const queryClient = useQueryClient();
  const [reviewTarget, setReviewTarget] = useState<{ item: ContentItem; action: "approved" | "rejected" | "revision_requested" } | null>(null);
  const [publishTarget, setPublishTarget] = useState<ContentItem | null>(null);
  const [publishInitialUrl, setPublishInitialUrl] = useState<string | undefined>(undefined);
  const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);
  const [usingRealScreenFor, setUsingRealScreenFor] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<{ item: ContentItem; asset: CampaignAsset } | null>(null);
  const [galleryTarget, setGalleryTarget] = useState<ContentItem | null>(null);
  const [linkingAssetId, setLinkingAssetId] = useState<string | null>(null);

  const { data: assetsData } = useQuery<{ ok: boolean; total: number; assets: CampaignAsset[] }>({
    queryKey: ["campaign-assets", campaignId, companySlug],
    queryFn: () => {
      const p = new URLSearchParams();
      if (companySlug) p.set("company_slug", companySlug);
      return apiFetch(`/marketing/assets/campaign/${campaignId}${p.toString() ? `?${p}` : ""}`);
    },
    enabled: !!campaignId,
  });

  const { data, isLoading, error } = useQuery<{ ok: boolean; total: number; items: ContentItem[] }>({
    queryKey: ["my-content-pack", campaignId, companySlug],
    queryFn: () => {
      const p = new URLSearchParams({ campaign_id: campaignId });
      if (companySlug) p.set("company_slug", companySlug);
      return apiFetch(`/marketing/content-pack/my?${p}`);
    },
    enabled: !!campaignId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note: string }) =>
      apiFetch(`/marketing/content-pack/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, note: note || undefined }),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["my-content-pack", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["my-campaigns"] });
      const labels: Record<string, string> = { approved: "Aprovado!", rejected: "Reprovado.", revision_requested: "Revisão solicitada." };
      toast.success(labels[vars.status] || "Atualizado");
      setReviewTarget(null);
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const publishMutation = useMutation({
    mutationFn: (payload: {
      imageUrl: string;
      publishMode: "immediate" | "scheduled";
      scheduledAt: string | null;
    }) => {
      if (!publishTarget) throw new Error("Nenhum item selecionado");
      return apiFetch("/marketing/publish", {
        method: "POST",
        body: JSON.stringify({
          companySlug: publishTarget.companySlug ?? companySlug ?? "mirage",
          caption: publishTarget.caption || publishTarget.hook || "",
          imageUrl: payload.imageUrl,
          publishMode: payload.publishMode,
          scheduledAt: payload.scheduledAt,
          contentItemId: publishTarget.id,
          campaignId: publishTarget.campaignId,
        }),
      });
    },
    onSuccess: (data: { ok: boolean; publication_id: string; status: string; error?: string }) => {
      if (data.ok) {
        toast.success("Publicação enviada ao n8n com sucesso!");
      } else {
        toast.error(`n8n retornou erro: ${data.error ?? "desconhecido"}`);
      }
      queryClient.invalidateQueries({ queryKey: ["campaign-publications", campaignId] });
      setPublishTarget(null);
    },
    onError: (err: Error) => toast.error(`Erro ao publicar: ${err.message}`),
  });

  const handlePublish = (item: ContentItem) => {
    const assets = assetsData?.assets ?? [];
    const match = assets.find(a => a.contentItemId === item.id);
    const url = match ? `${window.location.origin}${imgUrl(match.storagePath)}` : undefined;
    setPublishInitialUrl(url);
    setPublishTarget(item);
  };

  const handleGenerateImage = async (item: ContentItem, variant: BrandingVariant = "auto") => {
    setGeneratingImageFor(item.id);
    try {
      const body: Record<string, string> = { content_item_id: item.id, branding_variant: variant };
      if (companySlug) body.company_slug = companySlug;
      await apiFetch("/marketing/assets/generate", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast.success("Imagem gerada e vinculada ao item!");
      queryClient.invalidateQueries({ queryKey: ["campaign-assets", campaignId] });
    } catch (err: unknown) {
      toast.error(`Erro ao gerar imagem: ${err instanceof Error ? err.message : "desconhecido"}`);
    } finally {
      setGeneratingImageFor(null);
    }
  };

  const handleUseRealScreen = async (item: ContentItem, screenKey: string) => {
    setUsingRealScreenFor(item.id);
    try {
      const body: Record<string, string> = {
        campaign_id: campaignId,
        content_item_id: item.id,
        screen_key: screenKey,
      };
      if (companySlug) body.company_slug = companySlug;
      await apiFetch("/marketing/assets/use-real-screen", { method: "POST", body: JSON.stringify(body) });
      toast.success("Tela real vinculada ao post!");
      queryClient.invalidateQueries({ queryKey: ["campaign-assets", campaignId] });
    } catch (err: unknown) {
      toast.error(`Erro: ${err instanceof Error ? err.message : "desconhecido"}`);
    } finally {
      setUsingRealScreenFor(null);
    }
  };

  const { data: libraryData } = useQuery<{ ok: boolean; total: number; assets: TenantAsset[] }>({
    queryKey: ["tenant-library", companySlug],
    queryFn: () => {
      const p = new URLSearchParams();
      if (companySlug) p.set("company_slug", companySlug);
      return apiFetch(`/marketing/library${p.toString() ? `?${p}` : ""}`);
    },
    enabled: !!companySlug,
  });

  const handleLinkLibraryAsset = async (libraryAssetId: string) => {
    if (!galleryTarget) return;
    setLinkingAssetId(libraryAssetId);
    try {
      await apiFetch(`/marketing/library/${libraryAssetId}/link`, {
        method: "POST",
        body: JSON.stringify({
          campaign_id: campaignId,
          content_item_id: galleryTarget.id,
          company_slug: companySlug ?? "mirage",
        }),
      });
      toast.success("Imagem da biblioteca vinculada ao post!");
      queryClient.invalidateQueries({ queryKey: ["campaign-assets", campaignId] });
      setGalleryTarget(null);
    } catch (err: unknown) {
      toast.error(`Erro: ${err instanceof Error ? err.message : "desconhecido"}`);
    } finally {
      setLinkingAssetId(null);
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>;
  if (error || !data) return <div className="py-12 text-center text-red-400 text-sm">Erro ao carregar conteúdo.</div>;

  const items = data.items;
  const pending  = items.filter(i => i.status === "pending" || i.status === "revision_requested");
  const approved = items.filter(i => i.status === "approved");
  const rejected = items.filter(i => i.status === "rejected");
  const byType = {
    feed_post:    items.filter(i => i.contentType === "feed_post"),
    video_script: items.filter(i => i.contentType === "video_script"),
    carousel:     items.filter(i => i.contentType === "carousel"),
  };

  return (
    <>
      {reviewTarget && (
        <ReviewModal
          item={reviewTarget.item}
          action={reviewTarget.action}
          onClose={() => setReviewTarget(null)}
          loading={statusMutation.isPending}
          onConfirm={(note) => statusMutation.mutate({ id: reviewTarget.item.id, status: reviewTarget.action, note })}
        />
      )}
      {publishTarget && (
        <PublishModal
          item={publishTarget}
          companySlug={publishTarget.companySlug ?? companySlug}
          onClose={() => { setPublishTarget(null); setPublishInitialUrl(undefined); }}
          loading={publishMutation.isPending}
          onConfirm={(data) => publishMutation.mutate(data)}
          initialImageUrl={publishInitialUrl}
        />
      )}
      {previewTarget && (
        <InstagramPreviewModal
          item={previewTarget.item}
          asset={previewTarget.asset}
          companySlug={companySlug}
          onClose={() => setPreviewTarget(null)}
        />
      )}

      {/* Gallery picker modal */}
      <Dialog open={!!galleryTarget} onOpenChange={(open) => { if (!open) setGalleryTarget(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-orange-500" /> Escolher da biblioteca
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-2">
            Selecione uma imagem para vincular a <strong>{galleryTarget?.title || "este post"}</strong>
          </p>
          {(libraryData?.assets ?? []).length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <Upload className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Biblioteca vazia</p>
              <p className="text-xs mt-1">Faça upload de imagens na aba Assets para usar aqui</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
              {(libraryData?.assets ?? []).map((asset) => (
                <button
                  key={asset.id}
                  disabled={!!linkingAssetId}
                  onClick={() => handleLinkLibraryAsset(asset.id)}
                  className="group relative rounded-xl overflow-hidden bg-gray-100 aspect-square hover:ring-2 hover:ring-orange-400 transition-all disabled:opacity-50"
                >
                  <img src={imgUrl(asset.storagePath)} alt={asset.filename} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                  {linkingAssetId === asset.id && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-[10px] truncate">{asset.filename}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setGalleryTarget(null)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="rounded-xl bg-white border p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-amber-700">{pending.length}</p>
          <p className="text-xs text-amber-600">Pendentes</p>
        </div>
        <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-700">{approved.length}</p>
          <p className="text-xs text-green-600">Aprovados</p>
        </div>
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-red-600">{rejected.length}</p>
          <p className="text-xs text-red-500">Reprovados</p>
        </div>
      </div>

      <Tabs defaultValue="pendentes">
        <TabsList className="h-9 mb-4 flex-wrap gap-1">
          <TabsTrigger value="pendentes" className="text-xs">
            Pendentes {pending.length > 0 && <span className="ml-1 bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{pending.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="todos" className="text-xs">Todos ({items.length})</TabsTrigger>
          <TabsTrigger value="feed" className="text-xs">Feed ({byType.feed_post.length})</TabsTrigger>
          <TabsTrigger value="video" className="text-xs">Vídeo ({byType.video_script.length})</TabsTrigger>
          <TabsTrigger value="carrossel" className="text-xs">Carrossel ({byType.carousel.length})</TabsTrigger>
          <TabsTrigger value="calendario" className="text-xs"><Calendar className="w-3 h-3 mr-1" />Calendário</TabsTrigger>
        </TabsList>

        {[
          { value: "pendentes", list: pending },
          { value: "todos", list: items },
          { value: "feed", list: byType.feed_post },
          { value: "video", list: byType.video_script },
          { value: "carrossel", list: byType.carousel },
        ].map(({ value, list }) => (
          <TabsContent key={value} value={value}>
            {list.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{value === "pendentes" ? "Tudo revisado! 🎉" : "Nenhum item nesta categoria."}</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map(item => <ContentCard key={item.id} item={item} onReview={(i, a) => setReviewTarget({ item: i, action: a })} onPublish={handlePublish} onGenerateImage={handleGenerateImage} generatingImageFor={generatingImageFor} existingAsset={(assetsData?.assets ?? []).find(a => a.contentItemId === item.id) ?? null} onUseRealScreen={isMirage ? handleUseRealScreen : undefined} usingRealScreenFor={usingRealScreenFor} onPreview={(i, a) => setPreviewTarget({ item: i, asset: a })} onPickFromLibrary={(item) => setGalleryTarget(item)} />)}
              </div>
            )}
          </TabsContent>
        ))}

        <TabsContent value="calendario">
          <div className="grid gap-3">
            {Array.from({ length: 30 }, (_, i) => i + 1).map(day => {
              const dayItems = items.filter(i => i.scheduledDay === day);
              if (!dayItems.length) return null;
              return (
                <div key={day} className="flex gap-3 items-start">
                  <div className="w-12 h-12 rounded-xl bg-white border flex items-center justify-center shrink-0">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 leading-none">Dia</p>
                      <p className="text-lg font-bold text-gray-700 leading-tight">{day}</p>
                    </div>
                  </div>
                  <div className="flex-1 grid gap-2">
                    {dayItems.map(item => <ContentCard key={item.id} item={item} onReview={(i, a) => setReviewTarget({ item: i, action: a })} onPublish={handlePublish} onGenerateImage={handleGenerateImage} generatingImageFor={generatingImageFor} existingAsset={(assetsData?.assets ?? []).find(a => a.contentItemId === item.id) ?? null} onUseRealScreen={isMirage ? handleUseRealScreen : undefined} usingRealScreenFor={usingRealScreenFor} onPreview={(i, a) => setPreviewTarget({ item: i, asset: a })} onPickFromLibrary={(item) => setGalleryTarget(item)} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

// ── Layer 3: Campaign View ────────────────────────────────────────────────────

function CampaignView({
  campaignId, companySlug, pendingCount,
  onBack,
}: {
  campaignId: string;
  companySlug?: string | null;
  pendingCount: number;
  onBack: () => void;
}) {
  const { data: assetsData } = useQuery<{ ok: boolean; total: number; assets: CampaignAsset[] }>({
    queryKey: ["campaign-assets", campaignId, companySlug],
    queryFn: () => {
      const p = new URLSearchParams();
      if (companySlug) p.set("company_slug", companySlug);
      return apiFetch(`/marketing/assets/campaign/${campaignId}${p.toString() ? `?${p}` : ""}`);
    },
    enabled: !!campaignId,
  });

  const assetCount = assetsData?.assets?.length ?? 0;
  const defaultTab = assetCount > 0 ? "assets" : "conteudo";

  const isMirage = (companySlug ?? "").toLowerCase() === "mirage";

  const libInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLib, setUploadingLib] = useState(false);
  const queryClient = useQueryClient();

  async function handleLibUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !companySlug) return;
    setUploadingLib(true);
    try {
      const data_base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await apiFetch("/marketing/library/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_slug: companySlug, filename: file.name, data_base64, mimetype: file.type }),
      });
      toast.success("Imagem adicionada à galeria!");
      queryClient.invalidateQueries({ queryKey: ["library-assets", companySlug] });
    } catch {
      toast.error("Erro ao fazer upload");
    } finally {
      setUploadingLib(false);
      if (libInputRef.current) libInputRef.current.value = "";
    }
  }

  const MIRAGE_COPY = [
    { label: "Headline",       text: "O software que organiza a confecção de ponta a ponta." },
    { label: "Subheadline",    text: "Produção, desenvolvimento, custos, relatórios e operação em um único ecossistema para a confecção brasileira." },
    { label: "CTA principal",  text: "Agendar demonstração" },
    { label: "CTA secundário", text: "Entrar na fase fundadora" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Campanhas
        </Button>
        <span className="text-gray-300">/</span>
        <p className="text-sm font-mono text-gray-600 truncate">{campaignId}</p>
        {pendingCount > 0 && (
          <span className="ml-auto text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-semibold">
            {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>


      <Tabs defaultValue={defaultTab}>
        <div className="flex items-center gap-3 mb-6">
          <TabsList className="h-10">
            <TabsTrigger value="assets" className="text-xs gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> Assets
              {assetCount > 0 && <span className="ml-1 bg-violet-100 text-violet-700 text-[10px] px-1.5 rounded-full">{assetCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="conteudo" className="text-xs gap-1.5">
              <AlignLeft className="w-3.5 h-3.5" /> Conteúdo
              {pendingCount > 0 && <span className="ml-1 bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{pendingCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="publicacoes" className="text-xs gap-1.5">
              <Instagram className="w-3.5 h-3.5" /> Publicações
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-xs gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> Performance
            </TabsTrigger>
          </TabsList>

          <button
            onClick={() => libInputRef.current?.click()}
            disabled={uploadingLib || !companySlug}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {uploadingLib ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Galeria
          </button>
          <input ref={libInputRef} type="file" accept="image/*" className="hidden" onChange={handleLibUpload} />
        </div>

        <TabsContent value="assets">
          <AssetsTab campaignId={campaignId} companySlug={companySlug} isMirage={isMirage} />
        </TabsContent>
        <TabsContent value="conteudo">
          <ContentTab campaignId={campaignId} companySlug={companySlug} isMirage={isMirage} />
        </TabsContent>
        <TabsContent value="publicacoes">
          <PublicationsTab campaignId={campaignId} companySlug={companySlug} />
        </TabsContent>
        <TabsContent value="performance">
          <PerformanceTab campaignId={campaignId} companySlug={companySlug} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Layer 2: Campaign List ────────────────────────────────────────────────────

function CampaignList({
  campaigns,
  thumbnails,
  companySlug,
  onSelect,
  onBack,
  showBackButton,
}: {
  campaigns: Campaign[];
  thumbnails: Record<string, string>;
  companySlug: string | null;
  onSelect: (c: Campaign) => void;
  onBack?: () => void;
  showBackButton: boolean;
}) {
  const totalPending = campaigns.reduce((s, c) => s + c.pending, 0);
  const totalApproved = campaigns.reduce((s, c) => s + c.approved, 0);
  const totalItems = campaigns.reduce((s, c) => s + c.total, 0);
  const cfg = companySlug ? getTenantCfg(companySlug) : null;

  return (
    <div className="space-y-5">
      {/* Tenant header banner */}
      {cfg && companySlug && (
        <div className={`rounded-2xl bg-gradient-to-br ${cfg.gradient} p-5 text-white relative overflow-hidden`}>
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-4 w-36 h-36 rounded-full bg-black/10" />
          <div className="relative flex items-start justify-between">
            <div>
              {showBackButton && onBack && (
                <button onClick={onBack} className="text-white/70 hover:text-white text-xs flex items-center gap-1 mb-2 transition-colors">
                  <ArrowLeft className="w-3 h-3" /> Todos os tenants
                </button>
              )}
              <p className="text-white/60 text-[10px] uppercase tracking-widest mb-0.5">Tenant</p>
              <p className="text-white font-bold text-2xl tracking-wide">{cfg.label}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-[10px] uppercase tracking-widest mb-1">Campanhas</p>
              <p className="text-white font-bold text-3xl">{campaigns.length}</p>
            </div>
          </div>
          <div className="relative mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Itens totais", v: totalItems },
              { label: "Aprovados", v: totalApproved },
              { label: "Pendentes", v: totalPending },
            ].map(s => (
              <div key={s.label} className="bg-white/15 rounded-xl p-2 text-center backdrop-blur-sm">
                <p className="text-white font-bold text-lg">{s.v}</p>
                <p className="text-white/70 text-[10px]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section label */}
      {campaigns.length > 0 && (
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Campanhas</p>
          <div className="flex-1 h-px bg-gray-100" />
          {totalPending > 0 && (
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
              {totalPending} aguardando revisão
            </span>
          )}
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="py-16 text-center">
          <Megaphone className="w-16 h-16 mx-auto mb-4 text-gray-200" />
          <p className="text-gray-500 font-semibold text-lg">Nenhuma campanha ainda</p>
          {showBackButton && companySlug ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-gray-400 max-w-sm mx-auto">
                Configure o brand blueprint e use a Máquina de Marketing para gerar o primeiro pacote de conteúdo.
              </p>
              <a
                href={`/hub/marketing/maquina?slug=${companySlug}`}
                className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Abrir Máquina de Marketing
              </a>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
              O ATHOS está preparando o primeiro pacote de conteúdo. Em breve aparecerá aqui.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => {
            const thumb = thumbnails[c.campaignId];
            const hasAction = c.pending > 0;
            return (
              <button
                key={c.campaignId}
                onClick={() => onSelect(c)}
                className="text-left rounded-2xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg hover:border-violet-300 transition-all group"
              >
                <div className="relative h-36 bg-gradient-to-br from-violet-100 to-purple-200 overflow-hidden">
                  {thumb ? (
                    <img
                      src={imgUrl(thumb)}
                      alt="thumbnail"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = "none";
                        const ph = target.nextElementSibling as HTMLElement | null;
                        if (ph) ph.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div className="w-full h-full items-center justify-center" style={{ display: thumb ? "none" : "flex" }}>
                    <ImageIcon className="w-10 h-10 text-violet-300" />
                  </div>
                  {hasAction && (
                    <div className="absolute top-2 right-2">
                      <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-semibold shadow">
                        {c.pending} pendente{c.pending !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
                <div className="p-3">
                  <p className="text-[11px] font-mono text-gray-400 truncate mb-2">{c.campaignId}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 text-xs">
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-3 h-3" /> {c.approved}
                      </span>
                      <span className="flex items-center gap-1 text-amber-600">
                        <Clock className="w-3 h-3" /> {c.pending}
                      </span>
                      <span className="flex items-center gap-1 text-gray-400">
                        <BarChart3 className="w-3 h-3" /> {c.total}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tenant identity config ────────────────────────────────────────────────────

interface TenantConfig {
  gradient: string;
  gradientLight: string;
  accent: string;
  accentText: string;
  ring: string;
  label: string;
  icon: string;
}

const TENANT_CFG: Record<string, TenantConfig> = {
  mirage: {
    gradient: "from-violet-600 via-purple-600 to-indigo-700",
    gradientLight: "from-violet-50 to-purple-100",
    accent: "bg-violet-600",
    accentText: "text-violet-700",
    ring: "ring-violet-300 hover:ring-violet-400",
    label: "Mirage Hub",
    icon: "✦",
  },
  r2pb: {
    gradient: "from-blue-600 via-sky-500 to-blue-700",
    gradientLight: "from-blue-50 to-sky-100",
    accent: "bg-blue-600",
    accentText: "text-blue-700",
    ring: "ring-blue-300 hover:ring-blue-400",
    label: "R2PB",
    icon: "◈",
  },
};

function getTenantCfg(slug: string): TenantConfig {
  return TENANT_CFG[slug.toLowerCase()] ?? {
    gradient: "from-gray-600 to-gray-700",
    gradientLight: "from-gray-50 to-gray-100",
    accent: "bg-gray-600",
    accentText: "text-gray-700",
    ring: "ring-gray-300 hover:ring-gray-400",
    label: slug.toUpperCase(),
    icon: "◉",
  };
}

// ── Layer 1: Company List (super admin only) ──────────────────────────────────

interface CompanyStats {
  slug: string;
  totalCampaigns: number;
  pending: number;
  approved: number;
  total: number;
  lastActivity: string;
}

function CompanyList({
  companies,
  thumbnails,
  onSelect,
}: {
  companies: CompanyStats[];
  thumbnails: Record<string, string>;
  onSelect: (slug: string) => void;
}) {
  const totalPending = companies.reduce((s, c) => s + c.pending, 0);
  const totalItems   = companies.reduce((s, c) => s + c.total, 0);
  const totalCampaigns = companies.reduce((s, c) => s + c.totalCampaigns, 0);

  // Acessar empresa sem campanhas ainda
  const [accessSlug, setAccessSlug] = useState('');
  const [showAccess, setShowAccess] = useState(false);
  const { data: tenantsData } = useQuery<{ tenants: Array<{ id: string; name: string; slug: string }> }>({
    queryKey: ['admin-tenants-marketing'],
    queryFn: () => apiFetch('/admin/tenants'),
    enabled: showAccess,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">
      {/* Global stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Tenants ativos", value: companies.length, color: "text-violet-700", bg: "bg-violet-50 border-violet-100" },
          { label: "Campanhas totais", value: totalCampaigns, color: "text-blue-700", bg: "bg-blue-50 border-blue-100" },
          { label: "Itens pendentes", value: totalPending, color: totalPending > 0 ? "text-amber-700" : "text-gray-400", bg: totalPending > 0 ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Section label */}
      <div className="flex items-center gap-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Tenants</p>
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400">{totalItems} itens no total</span>
      </div>

      {companies.length === 0 ? (
        <div className="py-16 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-200" />
          <p className="text-gray-400 font-medium">Nenhuma empresa com campanhas ainda</p>
          <p className="text-sm text-gray-300 mt-1 mb-6">Use o painel abaixo para acessar um tenant e começar.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {companies.map((co) => {
            const cfg = getTenantCfg(co.slug);
            const thumb = thumbnails[co.slug];
            const pendingPct = co.total > 0 ? Math.round((co.pending / co.total) * 100) : 0;
            const approvedPct = co.total > 0 ? Math.round((co.approved / co.total) * 100) : 0;

            return (
              <button
                key={co.slug}
                onClick={() => onSelect(co.slug)}
                className={`text-left rounded-2xl border-2 bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-200 ring-2 ring-transparent ${cfg.ring} focus:outline-none`}
              >
                {/* Gradient header */}
                <div className={`relative h-32 bg-gradient-to-br ${cfg.gradient} overflow-hidden`}>
                  {thumb && (
                    <img
                      src={imgUrl(thumb)}
                      alt={co.slug}
                      className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  {/* Decorative circles */}
                  <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
                  <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-black/10" />

                  <div className="absolute inset-0 p-4 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <span className="text-3xl opacity-60">{cfg.icon}</span>
                      {co.pending > 0 && (
                        <span className="text-[11px] bg-amber-400 text-amber-900 font-bold px-2.5 py-1 rounded-full shadow-sm">
                          {co.pending} pendente{co.pending !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-white/70 text-[10px] uppercase tracking-widest font-semibold mb-0.5">Tenant</p>
                      <p className="text-white font-bold text-xl tracking-wide drop-shadow-sm">{cfg.label}</p>
                    </div>
                  </div>
                </div>

                {/* Stats body */}
                <div className="p-4 space-y-3">
                  {/* Counts row */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { v: co.totalCampaigns, label: "Campanhas", color: "text-gray-800" },
                      { v: co.approved,       label: "Aprovados",  color: "text-green-600" },
                      { v: co.total,          label: "Itens",      color: "text-gray-600" },
                    ].map(s => (
                      <div key={s.label} className="bg-gray-50 rounded-lg py-1.5">
                        <p className={`text-lg font-bold ${s.color}`}>{s.v}</p>
                        <p className="text-[10px] text-gray-400">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  {co.total > 0 && (
                    <div>
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>Progresso de aprovação</span>
                        <span>{approvedPct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full flex">
                          <div className="bg-green-400 transition-all" style={{ width: `${approvedPct}%` }} />
                          <div className="bg-amber-300 transition-all" style={{ width: `${pendingPct}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-gray-400">
                      {new Date(co.lastActivity).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </p>
                    <span className={`text-[11px] font-semibold ${cfg.accentText} flex items-center gap-1`}>
                      Ver campanhas →
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Acessar empresa sem campanhas */}
      <div className="mt-2">
        <button
          onClick={() => setShowAccess(v => !v)}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-violet-600 transition-colors font-medium"
        >
          <Building2 className="w-3.5 h-3.5" />
          {showAccess ? "Fechar" : "Acessar empresa sem campanhas"}
          <ChevronDown className={`w-3 h-3 transition-transform ${showAccess ? "rotate-180" : ""}`} />
        </button>

        {showAccess && (
          <div className="mt-3 rounded-xl border border-dashed border-violet-200 bg-violet-50/50 p-4 space-y-3">
            <p className="text-xs text-violet-700 font-semibold">Selecionar tenant registrado</p>

            {/* Dropdown de tenants */}
            {tenantsData?.tenants && tenantsData.tenants.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {tenantsData.tenants
                  .filter(t => t.slug)
                  .map(t => (
                    <button
                      key={t.id}
                      onClick={() => onSelect(t.slug)}
                      className="text-left rounded-lg border border-violet-200 bg-white px-3 py-2 hover:border-violet-400 hover:shadow-sm transition-all group"
                    >
                      <p className="text-xs font-semibold text-gray-700 group-hover:text-violet-700">{t.name}</p>
                      <p className="text-[10px] font-mono text-gray-400 mt-0.5">{t.slug}</p>
                    </button>
                  ))}
              </div>
            ) : tenantsData ? (
              <p className="text-xs text-gray-400">Nenhum tenant com slug registrado.</p>
            ) : (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Carregando tenants…
              </div>
            )}

            {/* Ou slug manual */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 h-px bg-violet-100" />
              <span className="text-[10px] text-violet-400 uppercase tracking-widest">ou</span>
              <div className="flex-1 h-px bg-violet-100" />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Slug manual (ex: r2pb)"
                value={accessSlug}
                onChange={e => setAccessSlug(e.target.value.toLowerCase().trim())}
                onKeyDown={e => { if (e.key === "Enter" && accessSlug) { onSelect(accessSlug); setShowAccess(false); setAccessSlug(''); } }}
                className="h-8 text-xs font-mono"
              />
              <Button
                size="sm"
                disabled={!accessSlug}
                onClick={() => { if (accessSlug) { onSelect(accessSlug); setShowAccess(false); setAccessSlug(''); } }}
                className="h-8 text-xs px-3 bg-violet-600 hover:bg-violet-700"
              >
                Ir
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MarketingPanel() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();

  // Lê ?company=slug da URL para abrir diretamente no contexto certo
  const urlCompany = new URLSearchParams(search).get("company") ?? null;

  const [selectedCompany, setSelectedCompany] = useState<string | null>(urlCompany);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Sempre chama /my/campaigns — o backend detecta isSuperAdmin e devolve
  // na resposta. Zero dependência de email/timing no frontend.
  // Key com prefixo "v4" para evitar cache antigo de versões anteriores.
  const { data: campaignsData, isLoading } = useQuery<{ ok: boolean; isSuperAdmin: boolean; company_slug: string | null; campaigns: Campaign[] }>({
    queryKey: ["marketing-panel-v4", selectedCompany],
    enabled: isAuthenticated && !authLoading,
    queryFn: () => {
      const p = new URLSearchParams();
      if (selectedCompany) p.set("company_slug", selectedCompany);
      return apiFetch(`/marketing/content-pack/my/campaigns${p.toString() ? `?${p}` : ""}`);
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  const { data: thumbsData } = useQuery<{ ok: boolean; thumbnails: AssetThumbnail[] }>({
    queryKey: ["marketing-thumbnails", selectedCompany],
    queryFn: () => {
      const p = new URLSearchParams();
      if (selectedCompany) p.set("company_slug", selectedCompany);
      return apiFetch(`/marketing/assets/thumbnails${p.toString() ? `?${p}` : ""}`);
    },
  });

  // isSuperAdmin vem do backend — campo na resposta de /my/campaigns
  const isSuperAdmin = campaignsData?.isSuperAdmin ?? false;

  const allCampaigns: Campaign[] = campaignsData?.campaigns ?? [];
  const companySlug = isSuperAdmin ? selectedCompany : (campaignsData?.company_slug ?? null);
  const isMirageContext = (companySlug ?? "").toLowerCase() === "mirage";

  const thumbnailMap: Record<string, string> = {};
  const companyThumbMap: Record<string, string> = {};
  for (const t of thumbsData?.thumbnails ?? []) {
    thumbnailMap[t.campaignId] = t.storagePath;
    const slug = t.companySlug || t.campaignId.split("_")[0];
    if (slug && !companyThumbMap[slug]) companyThumbMap[slug] = t.storagePath;
  }

  const filteredCampaigns = isSuperAdmin && selectedCompany
    ? allCampaigns.filter(c => c.companySlug === selectedCompany)
    : allCampaigns;

  const companies: CompanyStats[] = isSuperAdmin && !selectedCompany
    ? Object.values(
        allCampaigns.reduce((acc, c) => {
          if (!acc[c.companySlug]) acc[c.companySlug] = { slug: c.companySlug, totalCampaigns: 0, pending: 0, approved: 0, total: 0, lastActivity: c.createdAt };
          acc[c.companySlug].totalCampaigns++;
          acc[c.companySlug].pending += c.pending;
          acc[c.companySlug].approved += c.approved;
          acc[c.companySlug].total += c.total;
          if (new Date(c.createdAt) > new Date(acc[c.companySlug].lastActivity)) {
            acc[c.companySlug].lastActivity = c.createdAt;
          }
          return acc;
        }, {} as Record<string, CompanyStats>)
      )
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/hub")} className="gap-1">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Marketing</h1>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                {/* Breadcrumb */}
                <button
                  onClick={() => { setSelectedCompany(null); setSelectedCampaign(null); }}
                  className={`hover:text-violet-600 transition-colors ${!selectedCompany && !selectedCampaign ? "text-violet-600 font-semibold" : ""}`}
                >
                  {isSuperAdmin ? "Empresas" : "Campanhas"}
                </button>
                {(selectedCompany || (!isSuperAdmin && selectedCampaign)) && (
                  <>
                    <span>/</span>
                    <button
                      onClick={() => setSelectedCampaign(null)}
                      className={`hover:text-violet-600 transition-colors ${selectedCompany && !selectedCampaign ? "text-violet-600 font-semibold" : ""}`}
                    >
                      {selectedCompany ?? companySlug ?? "—"}
                    </button>
                  </>
                )}
                {selectedCampaign && (
                  <>
                    <span>/</span>
                    <span className="text-violet-600 font-semibold font-mono truncate max-w-[120px]">{selectedCampaign.campaignId}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Máquina de Marketing */}
        {!selectedCampaign && !!companySlug && (
          <div className="mb-4 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-violet-900 leading-tight">Máquina de Marketing</p>
                <p className="text-xs text-violet-600 mt-0.5">Brand Blueprint → Campaign Strategy → Creative System</p>
              </div>
            </div>
            <a
              href={`/hub/marketing/maquina${companySlug ? `?slug=${companySlug}` : ""}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
            >
              Abrir máquina <ChevronRight className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Mirage Growth OS — Marketing Machine foi incorporada ao Growth OS */}
        {!selectedCampaign && (
          <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">Marketing Machine foi incorporada ao Mirage Growth OS</p>
                <p className="text-xs text-gray-400 mt-0.5">Branding, campanhas, criativos, tráfego, vendas e providers — agora numa central única e maior.</p>
              </div>
            </div>
            <a
              href="/hub/growth"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-100 text-gray-900 text-xs font-semibold rounded-lg transition-colors shrink-0"
            >
              Ir para o Growth OS <ChevronRight className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Materiais de Apoio — kits de parceiros (VhSys + Helena CRM) */}
        {!selectedCampaign && isMirageContext && (
          <div className="mb-6 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Kits de Marketing dos Parceiros</p>

            {/* Kit VhSys ERP */}
            <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
                  <ExternalLink className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-violet-400 uppercase tracking-wide leading-none mb-0.5">VhSys ERP</p>
                  <p className="text-sm font-semibold text-violet-900 leading-tight">Kit de Marketing para Redes Sociais</p>
                  <p className="text-xs text-violet-600 mt-0.5">Templates prontos: feed, stories e carrossel para confecção</p>
                </div>
              </div>
              <a
                href="https://materiais.vhsys.com.br/m%C3%ADdia-kit-parceiros"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
              >
                Acessar kit <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Kit Helena CRM — Artes Editáveis */}
            <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wide leading-none mb-0.5">Helena CRM</p>
                  <p className="text-sm font-semibold text-blue-900 leading-tight">Artes Editáveis para Anúncios Pagos</p>
                  <p className="text-xs text-blue-600 mt-0.5">Templates editáveis prontos para campanhas pagas</p>
                </div>
              </div>
              <a
                href="https://parceiros.helena.app/c/materiais/template-artes-editaveis-para-anuncios-pagos-632cae"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
              >
                Acessar kit <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Kit Helena CRM — Imagens, Vídeo e Ícones */}
            <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
                  <Video className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wide leading-none mb-0.5">Helena CRM</p>
                  <p className="text-sm font-semibold text-blue-900 leading-tight">Imagens, Vídeo e Ícones da Plataforma</p>
                  <p className="text-xs text-blue-600 mt-0.5">Assets oficiais: imagens, vídeos demonstrativos e ícones</p>
                </div>
              </div>
              <a
                href="https://parceiros.helena.app/c/materiais/material-imagens-video-e-icones-da-plataforma"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
              >
                Acessar kit <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center gap-3 text-gray-400 py-10">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Carregando...</span>
          </div>
        )}

        {/* Layer 3: Campaign Detail */}
        {!isLoading && selectedCampaign && (
          <CampaignView
            campaignId={selectedCampaign.campaignId}
            companySlug={selectedCampaign.companySlug}
            pendingCount={selectedCampaign.pending}
            onBack={() => setSelectedCampaign(null)}
          />
        )}

        {/* Layer 2: Campaign List */}
        {!isLoading && !selectedCampaign && (isSuperAdmin ? !!selectedCompany : true) && (
          <CampaignList
            campaigns={filteredCampaigns}
            thumbnails={thumbnailMap}
            companySlug={companySlug}
            onSelect={(c) => setSelectedCampaign(c)}
            onBack={() => setSelectedCompany(null)}
            showBackButton={isSuperAdmin && !!selectedCompany}
          />
        )}

        {/* Layer 1: Company List (super admin only) */}
        {!isLoading && isSuperAdmin && !selectedCompany && !selectedCampaign && (
          <CompanyList
            companies={companies}
            thumbnails={companyThumbMap}
            onSelect={(slug) => setSelectedCompany(slug)}
          />
        )}
      </div>
    </div>
  );
}
