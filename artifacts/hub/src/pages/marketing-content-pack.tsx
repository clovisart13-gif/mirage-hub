import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar, Video, Image, AlignLeft, Zap, ArrowLeft,
  ChevronDown, ChevronUp, Loader2, AlertCircle, BarChart3,
  RefreshCw, Clock, Sparkles
} from "lucide-react";
import { apiFetch } from "@/lib/api";

const ADMIN_EMAIL = "clovisart13@gmail.com";

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
  scriptJson: Record<string, unknown> | null;
  createdAt: string;
}

interface Campaign {
  campaignId: string;
  companySlug: string;
}

const CONTENT_TYPE_CONFIG: Record<string, { label: string; icon: typeof Video; color: string; bg: string }> = {
  feed_post:    { label: "Post Feed",      icon: Image,     color: "text-blue-600",   bg: "bg-blue-50 border-blue-200" },
  video_script: { label: "Roteiro Vídeo",  icon: Video,     color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  carousel:     { label: "Carrossel",      icon: AlignLeft, color: "text-emerald-600",bg: "bg-emerald-50 border-emerald-200" },
};

const FUNNEL_CONFIG: Record<string, { label: string; color: string }> = {
  awareness:     { label: "Topo",    color: "bg-sky-100 text-sky-700" },
  consideration: { label: "Meio",    color: "bg-amber-100 text-amber-700" },
  conversion:    { label: "Fundo",   color: "bg-rose-100 text-rose-700" },
};

function ContentCard({ item }: { item: ContentItem }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = CONTENT_TYPE_CONFIG[item.contentType] ?? CONTENT_TYPE_CONFIG.feed_post;
  const funnel = item.funnelStage ? FUNNEL_CONFIG[item.funnelStage] : null;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border p-4 ${cfg.bg} transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/70 shrink-0`}>
            <Icon className={`w-4 h-4 ${cfg.color}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cfg.label}</span>
              {funnel && (
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 border-0 ${funnel.color}`}>
                  {funnel.label}
                </Badge>
              )}
              {item.scheduledDay && (
                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                  <Calendar className="w-3 h-3" /> Dia {item.scheduledDay}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{item.title || "Sem título"}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 shrink-0"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {item.hook && (
        <p className="mt-3 text-sm text-gray-700 font-medium italic">
          "{item.hook}"
        </p>
      )}

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-black/10 pt-3">
          {item.caption && (
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Legenda</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{item.caption}</p>
            </div>
          )}
          {item.cta && (
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">CTA</p>
              <p className="text-sm text-gray-800 font-medium">{item.cta}</p>
            </div>
          )}
          {item.contentType === "video_script" && item.scriptJson && Object.keys(item.scriptJson).length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Roteiro</p>
              <div className="bg-white/60 rounded-lg p-3 text-sm space-y-1.5">
                {(item.scriptJson.duration as string) && (
                  <p className="text-xs text-gray-500">⏱ Duração: {item.scriptJson.duration as string}</p>
                )}
                {(item.scriptJson.narration as string) && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-0.5">Narração:</p>
                    <p className="text-sm text-gray-700 italic">{item.scriptJson.narration as string}</p>
                  </div>
                )}
                {Array.isArray(item.scriptJson.scenes) && item.scriptJson.scenes.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Cenas:</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      {(item.scriptJson.scenes as string[]).map((s, i) => (
                        <li key={i} className="text-xs text-gray-600">{s}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {(item.scriptJson.visual_notes as string) && (
                  <p className="text-xs text-gray-500">🎬 {item.scriptJson.visual_notes as string}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CampaignView({ campaignId }: { campaignId: string }) {
  const { data, isLoading, error, refetch } = useQuery<{ ok: boolean; total: number; items: ContentItem[] }>({
    queryKey: ["content-pack", campaignId],
    queryFn: () => apiFetch(`/marketing/content-pack?campaign_id=${encodeURIComponent(campaignId)}`),
    enabled: !!campaignId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Carregando conteúdo...</span>
      </div>
    );
  }

  if (error || !data?.items) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
        <AlertCircle className="w-8 h-8" />
        <p className="text-sm">Erro ao carregar conteúdo.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />Tentar novamente
        </Button>
      </div>
    );
  }

  const items = data.items;
  const byType = {
    feed_post:    items.filter(i => i.contentType === "feed_post"),
    video_script: items.filter(i => i.contentType === "video_script"),
    carousel:     items.filter(i => i.contentType === "carousel"),
  };

  const funnelCounts = {
    awareness:     items.filter(i => i.funnelStage === "awareness").length,
    consideration: items.filter(i => i.funnelStage === "consideration").length,
    conversion:    items.filter(i => i.funnelStage === "conversion").length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white border p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total de itens</p>
        </div>
        <div className="rounded-xl bg-sky-50 border border-sky-200 p-4 text-center">
          <p className="text-2xl font-bold text-sky-700">{funnelCounts.awareness}</p>
          <p className="text-xs text-sky-600 mt-0.5">Topo de funil</p>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{funnelCounts.consideration}</p>
          <p className="text-xs text-amber-600 mt-0.5">Meio de funil</p>
        </div>
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-center">
          <p className="text-2xl font-bold text-rose-700">{funnelCounts.conversion}</p>
          <p className="text-xs text-rose-600 mt-0.5">Fundo de funil</p>
        </div>
      </div>

      <Tabs defaultValue="todos">
        <TabsList className="h-9">
          <TabsTrigger value="todos" className="text-xs">
            Todos ({items.length})
          </TabsTrigger>
          <TabsTrigger value="feed_post" className="text-xs">
            Feed ({byType.feed_post.length})
          </TabsTrigger>
          <TabsTrigger value="video_script" className="text-xs">
            Vídeo ({byType.video_script.length})
          </TabsTrigger>
          <TabsTrigger value="carousel" className="text-xs">
            Carrossel ({byType.carousel.length})
          </TabsTrigger>
          <TabsTrigger value="calendario" className="text-xs">
            Calendário
          </TabsTrigger>
        </TabsList>

        {(["todos", "feed_post", "video_script", "carousel"] as const).map((tab) => {
          const list = tab === "todos" ? items : byType[tab];
          return (
            <TabsContent key={tab} value={tab} className="mt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </div>
            </TabsContent>
          );
        })}

        <TabsContent value="calendario" className="mt-4">
          <div className="grid gap-2">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
              const dayItems = items.filter(i => i.scheduledDay === day);
              if (dayItems.length === 0) return null;
              return (
                <div key={day} className="flex gap-3 items-start">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 border flex items-center justify-center shrink-0">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 leading-none">Dia</p>
                      <p className="text-lg font-bold text-gray-700 leading-tight">{day}</p>
                    </div>
                  </div>
                  <div className="flex-1 grid gap-2">
                    {dayItems.map((item) => (
                      <ContentCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MarketingContentPack() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const isAdmin = (user as any)?.email === ADMIN_EMAIL;

  const { data: campaignsData, isLoading: loadingCampaigns } = useQuery<{
    ok: boolean;
    campaigns: Campaign[];
  }>({
    queryKey: ["content-pack-campaigns-mirage"],
    queryFn: () => apiFetch("/marketing/content-pack/my/campaigns?company_slug=mirage"),
    enabled: isAdmin,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const seedMutation = useMutation({
    mutationFn: () => apiFetch("/marketing/seed-mirage", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-pack-campaigns-mirage"] });
    },
  });

  const hubScreensMutation = useMutation({
    mutationFn: () => apiFetch("/marketing/assets/generate-hub-screens", { method: "POST", body: JSON.stringify({ company_slug: "mirage" }) }),
    onSuccess: (data: { count: number }) => {
      queryClient.invalidateQueries({ queryKey: ["content-pack-campaigns-mirage"] });
      alert(`✅ ${data.count} imagens do Hub geradas com branding Mirage! Veja na aba Assets da campanha.`);
    },
    onError: (err: Error) => alert(`Erro: ${err.message}`),
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-gray-600">Acesso restrito ao administrador.</p>
          <Button variant="outline" onClick={() => setLocation("/hub")}>Voltar ao Hub</Button>
        </div>
      </div>
    );
  }

  const campaigns = campaignsData?.campaigns ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/hub")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Máquina Mirage</h1>
              <p className="text-sm text-gray-500">Campanhas de conteúdo geradas pelo ATHOS</p>
            </div>
          </div>
          {campaigns.length > 0 && (
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (confirm("Gera 5 imagens automáticas com telas reais do Hub Mirage (Dashboard, Kanban, PLM, Conecta Moda, Relatórios) + branding completo. Sem DALL-E. Continuar?")) {
                    hubScreensMutation.mutate();
                  }
                }}
                disabled={hubScreensMutation.isPending}
                className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
              >
                {hubScreensMutation.isPending ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Gerando...</>
                ) : (
                  <><Sparkles className="w-3 h-3" /> Gerar imagens do Hub</>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Isso vai apagar e recriar a campanha Conecta Moda. Continuar?")) {
                    seedMutation.mutate();
                  }
                }}
                disabled={seedMutation.isPending}
                className="gap-2 text-violet-700 border-violet-300 hover:bg-violet-50"
              >
                {seedMutation.isPending ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Recriando...</>
                ) : (
                  <><RefreshCw className="w-3 h-3" /> Recriar campanha</>
                )}
              </Button>
            </div>
          )}
        </div>

        {loadingCampaigns ? (
          <div className="flex items-center gap-3 text-gray-400 py-10">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Carregando campanhas...</span>
          </div>
        ) : campaigns.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto" />
              <div>
                <p className="text-gray-500 font-medium">Nenhuma campanha Mirage gerada ainda.</p>
                <p className="text-sm text-gray-400 mt-1">
                  Campanha <span className="font-mono text-xs bg-gray-100 px-1 rounded">Conecta Moda — Fase Fundadora</span> pronta para ser ativada.
                </p>
              </div>
              <Button
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
              >
                {seedMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Criando campanha...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Criar campanha Conecta Moda</>
                )}
              </Button>
              {seedMutation.isError && (
                <p className="text-sm text-red-500">Erro ao criar campanha. Tente novamente.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((c) => (
                <button
                  key={c.campaignId}
                  onClick={() => setSelectedCampaign(
                    selectedCampaign === c.campaignId ? null : c.campaignId
                  )}
                  className={`text-left rounded-xl border p-4 transition-all hover:shadow-md ${
                    selectedCampaign === c.campaignId
                      ? "border-violet-500 bg-violet-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-violet-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${
                      selectedCampaign === c.campaignId ? "bg-violet-600" : "bg-gray-300"
                    }`} />
                    <span className="text-xs font-semibold text-gray-500 uppercase">{c.companySlug}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 font-mono break-all">
                    {c.campaignId}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">Clique para visualizar</span>
                  </div>
                </button>
              ))}
            </div>

            {selectedCampaign && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-gray-800 font-mono">
                    {selectedCampaign}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CampaignView campaignId={selectedCampaign} />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
