import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Sparkles, ImageIcon, Film, CheckCircle2,
  Clock, XCircle, RefreshCw, ExternalLink, ChevronRight,
  X, Send, AlertTriangle, Zap, Wand2, Plus, Loader2,
} from "lucide-react";

// ── Painel de Geração — R2PB Creative Image Generator ──────────────────────

type CreativeType = "streetwear" | "fitness" | "alfaiataria" | "generico";

function GerarImagemPanel({ onGenerated }: { onGenerated: () => void }) {
  const [open, setOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [creativeType, setCreativeType] = useState<CreativeType>("streetwear");
  const [title, setTitle] = useState("");
  const [contextNote, setContextNote] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; image_path?: string; asset?: { id: string } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!imagePrompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiFetch("/marketing/pilotos/gerar-imagem", {
        method: "POST",
        body: JSON.stringify({
          image_prompt: imagePrompt,
          creative_type: creativeType,
          title: title || null,
          context_note: contextNote || null,
          aspect_ratio: aspectRatio,
        }),
      });
      setResult(data);
      onGenerated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao gerar imagem");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
          border: "none", borderRadius: 10, padding: "10px 18px",
          color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
          boxShadow: "0 4px 20px #4f46e540",
        }}
      >
        <Wand2 style={{ width: 15, height: 15 }} />
        Gerar Imagem (Banana / Gemini)
      </button>
    );
  }

  return (
    <div style={{ background: "#0f172a", border: "1px solid #312e81", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#1e1b4b", borderBottom: "1px solid #312e81" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Wand2 style={{ width: 15, height: 15, color: "#818cf8" }} />
          <span style={{ color: "#e0e7ff", fontWeight: 700, fontSize: 13 }}>Gerar Imagem — R2PB Creative</span>
          <span style={{ fontSize: 10, background: "#312e81", color: "#a5b4fc", borderRadius: 4, padding: "1px 7px", fontWeight: 600 }}>Banana / Gemini 2.5 Flash</span>
        </div>
        <button onClick={() => { setOpen(false); setResult(null); setError(null); }} style={{ background: "transparent", border: "none", color: "#4b5563", cursor: "pointer", padding: 4 }}>
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Prompt principal */}
        <div>
          <label style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".5px" }}>
            Image Prompt <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <textarea
            value={imagePrompt}
            onChange={e => setImagePrompt(e.target.value)}
            placeholder="Descreva o visual: modelo, peça, ambiente, mood… O sistema vai enriquecer automaticamente com a direção criativa R2PB."
            rows={3}
            style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 10px", color: "#f1f5f9", fontSize: 12, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {/* Linha criativa */}
          <div>
            <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".5px" }}>Linha Visual</label>
            <select
              value={creativeType}
              onChange={e => setCreativeType(e.target.value as CreativeType)}
              style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "7px 10px", color: "#f1f5f9", fontSize: 12 }}
            >
              <option value="streetwear">🏙 Streetwear Urbano</option>
              <option value="fitness">⚡ Fitness / Performance</option>
              <option value="alfaiataria">👔 Alfaiataria Premium</option>
              <option value="generico">✦ Genérico R2PB</option>
            </select>
          </div>
          {/* Aspect ratio */}
          <div>
            <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".5px" }}>Proporção</label>
            <select
              value={aspectRatio}
              onChange={e => setAspectRatio(e.target.value)}
              style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "7px 10px", color: "#f1f5f9", fontSize: 12 }}
            >
              <option value="1:1">1:1 — Feed quadrado</option>
              <option value="4:5">4:5 — Feed retrato</option>
              <option value="9:16">9:16 — Stories / Reels</option>
              <option value="16:9">16:9 — Horizontal</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {/* Título */}
          <div>
            <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".5px" }}>Título do criativo</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Lookbook Verão Fitness"
              style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "7px 10px", color: "#f1f5f9", fontSize: 12 }}
            />
          </div>
          {/* Contexto */}
          <div>
            <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".5px" }}>Contexto da campanha</label>
            <input
              value={contextNote}
              onChange={e => setContextNote(e.target.value)}
              placeholder="Ex: Coleção Inverno 2025 — legging premium"
              style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "7px 10px", color: "#f1f5f9", fontSize: 12 }}
            />
          </div>
        </div>

        {/* Info box */}
        <div style={{ background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 12px", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Sparkles style={{ width: 12, height: 12, color: "#818cf8", marginTop: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 11, color: "#475569", margin: 0, lineHeight: 1.5 }}>
            O prompt será enriquecido automaticamente com a direção criativa premium R2PB — linha visual <strong style={{ color: "#6366f1" }}>{creativeType}</strong>, tipo de luz, cenário, textura, pose e negativos de IA genérica. A imagem entra em curadoria abaixo após a geração (~30s).
          </p>
        </div>

        {/* Erro */}
        {error && (
          <div style={{ background: "#1c0606", border: "1px solid #991b1b", borderRadius: 8, padding: "8px 12px", color: "#ef4444", fontSize: 12 }}>
            {error}
          </div>
        )}

        {/* Sucesso */}
        {result?.ok && (
          <div style={{ background: "#052e16", border: "1px solid #15803d", borderRadius: 8, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle2 style={{ width: 16, height: 16, color: "#22c55e", flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 12, color: "#22c55e", fontWeight: 700, margin: 0 }}>Imagem gerada com sucesso!</p>
              <p style={{ fontSize: 11, color: "#4ade80", margin: "2px 0 0" }}>Aguardando curadoria — role para baixo para ver o resultado.</p>
            </div>
          </div>
        )}

        {/* Botão */}
        <button
          onClick={handleGenerate}
          disabled={loading || !imagePrompt.trim()}
          style={{
            background: loading || !imagePrompt.trim() ? "#1e293b" : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            border: "none", borderRadius: 8, padding: "10px 0", color: loading || !imagePrompt.trim() ? "#334155" : "white",
            fontSize: 13, fontWeight: 700, cursor: loading || !imagePrompt.trim() ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all 0.15s",
          }}
        >
          {loading ? (
            <>
              <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
              Gerando imagem — ~30s…
            </>
          ) : (
            <>
              <Wand2 style={{ width: 14, height: 14 }} />
              Gerar Imagem Premium
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Tipos ────────────────────────────────────────────────────────────────────

interface GrowthAsset {
  id: string;
  tenantId: string;
  campaignId: string | null;
  assetType: string;
  provider: string;
  status: string;
  outputUrl: string | null;
  promptInput: { prompt?: string; script?: string; [k: string]: unknown } | null;
  title: string | null;
  createdAt: string;
}

// ── Helpers de UI ─────────────────────────────────────────────────────────────

const TENANT_CONFIG: Record<string, { nome: string; cor: string; corBg: string; inicial: string }> = {
  r2pb:   { nome: "R2PB Confecções", cor: "#6366f1", corBg: "#1e1b4b", inicial: "R2" },
  mirage: { nome: "Mirage Hub",      cor: "#8b5cf6", corBg: "#2e1065", inicial: "MH" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  awaiting_approval: { label: "Em revisão",  color: "#f59e0b", bg: "#1c1407", border: "#92400e", icon: Clock },
  approved:          { label: "Aprovado",     color: "#22c55e", bg: "#052e16", border: "#15803d", icon: CheckCircle2 },
  rejected:          { label: "Descartado",   color: "#ef4444", bg: "#1c0606", border: "#991b1b", icon: XCircle },
  generating:        { label: "Gerando",      color: "#60a5fa", bg: "#0c1a2e", border: "#1e3a5f", icon: RefreshCw },
  requested:         { label: "Na fila",      color: "#475569", bg: "#0f172a", border: "#1e293b", icon: Clock },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.requested;
  const Icon = cfg.icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <Icon style={{ width: 9, height: 9 }} />
      {cfg.label}
    </span>
  );
}

function ProviderBadge({ provider }: { provider: string }) {
  const map: Record<string, { label: string; color: string }> = {
    banana: { label: "🍌 Banana", color: "#86efac" },
    heygen: { label: "🎬 HeyGen", color: "#93c5fd" },
    openai: { label: "🤖 OpenAI", color: "#c4b5fd" },
  };
  const p = map[provider] ?? { label: provider, color: "#64748b" };
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color: p.color, background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 4, padding: "1px 6px" }}>{p.label}</span>
  );
}

// ── Card de asset ─────────────────────────────────────────────────────────────

function AssetCard({ asset, onClick }: { asset: GrowthAsset; onClick: () => void }) {
  const isImage = asset.assetType === "image";
  const imgSrc = isImage && asset.outputUrl
    ? `/api/storage${asset.outputUrl}`
    : null;

  return (
    <button
      onClick={onClick}
      style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden", cursor: "pointer", textAlign: "left", transition: "border-color 0.15s", width: "100%" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#334155")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#1e293b")}
    >
      {/* Thumbnail */}
      <div style={{ width: "100%", height: 160, background: "#0a0f1a", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {imgSrc ? (
          <img src={imgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "#1e293b" }}>
            {isImage ? <ImageIcon style={{ width: 32, height: 32 }} /> : <Film style={{ width: 32, height: 32 }} />}
            <span style={{ fontSize: 10, color: "#334155" }}>{isImage ? "Gerando imagem…" : "Vídeo em renderização"}</span>
          </div>
        )}
        {/* Overlay tipo */}
        <div style={{ position: "absolute", top: 8, left: 8 }}>
          <ProviderBadge provider={asset.provider} />
        </div>
        {/* Overlay tipo ativo */}
        <div style={{ position: "absolute", top: 8, right: 8, background: "#0a0f1a99", borderRadius: 4, padding: "2px 6px", fontSize: 10, color: "#475569", display: "flex", alignItems: "center", gap: 4 }}>
          {isImage ? <ImageIcon style={{ width: 9, height: 9 }} /> : <Film style={{ width: 9, height: 9 }} />}
          {isImage ? "image" : "video"}
        </div>
        {asset.status === "approved" && (
          <div style={{ position: "absolute", bottom: 8, right: 8 }}>
            <CheckCircle2 style={{ width: 18, height: 18, color: "#22c55e", filter: "drop-shadow(0 0 4px #052e16)" }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
          <StatusBadge status={asset.status} />
          <span style={{ fontSize: 10, color: "#334155" }}>
            {new Date(asset.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </span>
        </div>
        {(asset.promptInput?.prompt ?? asset.promptInput?.script) && (
          <p style={{ fontSize: 11, color: "#475569", margin: 0, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
            {asset.promptInput?.prompt ?? asset.promptInput?.script}
          </p>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#334155", fontSize: 11 }}>
          <span>Ver detalhes</span>
          <ChevronRight style={{ width: 10, height: 10 }} />
        </div>
      </div>
    </button>
  );
}

// ── Modal de detalhe ──────────────────────────────────────────────────────────

function AssetModal({
  asset,
  onClose,
  onApprove,
  onDiscard,
  onSyncVideo,
  loading,
}: {
  asset: GrowthAsset;
  onClose: () => void;
  onApprove: (id: string) => void;
  onDiscard: (id: string) => void;
  onSyncVideo: (jobId: string) => void;
  loading: boolean;
}) {
  const isImage = asset.assetType === "image";
  const imgSrc = isImage && asset.outputUrl ? `/api/storage${asset.outputUrl}` : null;
  const canApprove = asset.status === "awaiting_approval";
  const canDiscard = asset.status === "awaiting_approval";
  const isApproved = asset.status === "approved";
  const isDiscarded = asset.status === "rejected";
  const tenant = TENANT_CONFIG[asset.tenantId] ?? { nome: asset.tenantId, cor: "#6366f1", corBg: "#1e1b4b", inicial: asset.tenantId.slice(0, 2).toUpperCase() };

  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleSyncVideo = async () => {
    const jobIdMatch = asset.promptInput?.script
      ? null
      : null;
    if (!asset.id) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const data = await apiFetch(`/marketing/pilotos/sync-video/${asset.id}`, { method: "POST" });
      setSyncMsg(data?.video_url ? "Vídeo pronto!" : `Status: ${data?.job_status ?? "processando"}`);
      if (data?.video_url) onSyncVideo(data.video_url);
    } catch (err: unknown) {
      setSyncMsg(err instanceof Error ? err.message : "Erro ao verificar");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, width: "100%", maxWidth: 720, maxHeight: "90vh", overflow: "auto", display: "flex", flexDirection: "column" }}
      >
        {/* Header do modal */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: tenant.corBg, border: `1.5px solid ${tenant.cor}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, color: tenant.cor }}>
              {tenant.inicial}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{tenant.nome}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                <ProviderBadge provider={asset.provider} />
                <StatusBadge status={asset.status} />
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer", padding: 4 }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Corpo */}
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Imagem */}
          {isImage && (
            <div style={{ borderRadius: 10, overflow: "hidden", background: "#000", border: "1px solid #1e293b" }}>
              {imgSrc ? (
                <img src={imgSrc} alt="Asset gerado" style={{ width: "100%", display: "block", maxHeight: 420, objectFit: "contain" }} />
              ) : (
                <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#334155", flexDirection: "column", gap: 8 }}>
                  <ImageIcon style={{ width: 32, height: 32 }} />
                  <span style={{ fontSize: 12 }}>Imagem ainda sendo gerada</span>
                </div>
              )}
            </div>
          )}

          {/* Vídeo */}
          {!isImage && (
            <div style={{ border: "1px solid #1e293b", borderRadius: 10, overflow: "hidden", background: "#0a0f1a" }}>
              {asset.outputUrl ? (
                <>
                  <video controls style={{ width: "100%", display: "block", background: "#000", maxHeight: 360 }} src={asset.outputUrl} />
                  <div style={{ padding: "8px 12px" }}>
                    <a href={asset.outputUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#22c55e", fontSize: 11, textDecoration: "none" }}>
                      <ExternalLink style={{ width: 11, height: 11 }} /> Abrir vídeo externo
                    </a>
                  </div>
                </>
              ) : (
                <div style={{ padding: "16px 20px" }}>
                  <div style={{ background: "#060c18", border: "1px dashed #1e3a5f", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "#334155", marginBottom: 10 }}>
                    Avatar em renderização no HeyGen.
                  </div>
                  <button onClick={handleSyncVideo} disabled={syncing} style={{ display: "flex", alignItems: "center", gap: 5, background: "#172554", border: "1px solid #1e3a5f", borderRadius: 6, color: "#60a5fa", fontSize: 11, padding: "6px 12px", cursor: syncing ? "default" : "pointer", opacity: syncing ? 0.6 : 1, fontWeight: 600 }}>
                    <RefreshCw style={{ width: 11, height: 11, animation: syncing ? "spin 1s linear infinite" : "none" }} />
                    {syncing ? "Verificando…" : "Verificar se ficou pronto"}
                  </button>
                  {syncMsg && <p style={{ fontSize: 11, marginTop: 6, color: "#f59e0b" }}>{syncMsg}</p>}
                </div>
              )}
            </div>
          )}

          {/* Prompt / Script */}
          {(asset.promptInput?.prompt || asset.promptInput?.script) && (
            <div style={{ background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                {isImage ? "Prompt de geração" : "Script do vídeo"}
              </div>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.6, fontFamily: "monospace" }}>
                {asset.promptInput?.prompt ?? asset.promptInput?.script}
              </p>
            </div>
          )}

          {/* Campanha de origem */}
          {asset.campaignId && (
            <div style={{ background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <Zap style={{ width: 12, height: 12, color: "#334155", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#334155" }}>Campanha: <code style={{ color: "#475569" }}>{asset.campaignId}</code></span>
            </div>
          )}

          {/* Status final */}
          {isApproved && (
            <div style={{ background: "#052e16", border: "1px solid #15803d", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 style={{ width: 14, height: 14, color: "#22c55e" }} />
              <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>Aprovado e disponível na Máquina de Marketing</span>
            </div>
          )}
          {isDiscarded && (
            <div style={{ background: "#1c0606", border: "1px solid #991b1b", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <XCircle style={{ width: 14, height: 14, color: "#ef4444" }} />
              <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>Descartado — não será enviado para campanhas</span>
            </div>
          )}
        </div>

        {/* Ações */}
        {(canApprove || canDiscard) && (
          <div style={{ padding: "14px 20px", borderTop: "1px solid #1e293b", display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {canDiscard && (
              <button
                onClick={() => onDiscard(asset.id)}
                disabled={loading}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid #334155", borderRadius: 8, color: "#64748b", fontSize: 12, padding: "8px 16px", cursor: loading ? "default" : "pointer", fontWeight: 600 }}
              >
                <XCircle style={{ width: 13, height: 13 }} />
                Descartar
              </button>
            )}
            {canApprove && isImage && (
              <button
                onClick={() => onApprove(asset.id)}
                disabled={loading}
                style={{ display: "flex", alignItems: "center", gap: 6, background: loading ? "#1e293b" : "#1d4ed8", border: "1px solid #2563eb", borderRadius: 8, color: "#fff", fontSize: 12, padding: "8px 16px", cursor: loading ? "default" : "pointer", fontWeight: 700, opacity: loading ? 0.7 : 1 }}
              >
                <Send style={{ width: 13, height: 13 }} />
                {loading ? "Aprovando…" : "Aprovar e enviar para Campanhas"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Seção por tenant ──────────────────────────────────────────────────────────

function TenantSection({
  tenantId,
  assets,
  onSelect,
}: {
  tenantId: string;
  assets: GrowthAsset[];
  onSelect: (a: GrowthAsset) => void;
}) {
  const tenant = TENANT_CONFIG[tenantId] ?? { nome: tenantId, cor: "#6366f1", corBg: "#1e1b4b", inicial: "??" };
  const images = assets.filter(a => a.assetType === "image");
  const videos = assets.filter(a => a.assetType === "video");
  const approvedCount = assets.filter(a => a.status === "approved").length;

  return (
    <div style={{ border: `1px solid ${tenant.cor}33`, borderRadius: 14, overflow: "hidden", background: "#0f172a" }}>
      {/* Header tenant */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${tenant.cor}22`, background: `${tenant.corBg}55`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: tenant.corBg, border: `2px solid ${tenant.cor}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: tenant.cor }}>
            {tenant.inicial}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9" }}>{tenant.nome}</div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>{images.length} imagens · {videos.length} vídeos</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {approvedCount > 0 && (
            <span style={{ fontSize: 11, background: "#052e16", color: "#22c55e", border: "1px solid #15803d", borderRadius: 6, padding: "3px 9px", fontWeight: 600 }}>
              {approvedCount} aprovado{approvedCount !== 1 ? "s" : ""} ✓
            </span>
          )}
          <span style={{ fontSize: 11, background: "#0f172a", color: "#475569", border: "1px solid #1e293b", borderRadius: 6, padding: "3px 9px" }}>
            {assets.length} total
          </span>
        </div>
      </div>

      {/* Grid de cards */}
      <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
        {assets.map(a => (
          <AssetCard key={a.id} asset={a} onClick={() => onSelect(a)} />
        ))}
        {assets.length === 0 && (
          <div style={{ gridColumn: "1/-1", padding: "24px", textAlign: "center", color: "#334155", fontSize: 13 }}>
            Nenhum asset gerado para {tenant.nome}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function MarketingPilotosPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<GrowthAsset | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { data, isLoading, error } = useQuery<{ ok: boolean; assets: GrowthAsset[] }>({
    queryKey: ["pilotos-assets"],
    queryFn: () => apiFetch("/marketing/pilotos/assets"),
    refetchOnWindowFocus: false,
  });

  const assets = data?.assets ?? [];
  const byTenant: Record<string, GrowthAsset[]> = {};
  for (const a of assets) {
    if (!byTenant[a.tenantId]) byTenant[a.tenantId] = [];
    byTenant[a.tenantId].push(a);
  }

  const handleApprove = useCallback(async (assetId: string) => {
    setActionLoading(true);
    try {
      await apiFetch(`/marketing/pilotos/assets/${assetId}/approve`, { method: "POST" });
      await qc.invalidateQueries({ queryKey: ["pilotos-assets"] });
      // Atualiza o item selecionado com novo status
      setSelected(prev => prev?.id === assetId ? { ...prev, status: "approved" } : prev);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao aprovar");
    } finally {
      setActionLoading(false);
    }
  }, [qc]);

  const handleDiscard = useCallback(async (assetId: string) => {
    setActionLoading(true);
    try {
      await apiFetch(`/marketing/pilotos/assets/${assetId}/status`, { method: "POST", body: JSON.stringify({ status: "rejected" }) });
      await qc.invalidateQueries({ queryKey: ["pilotos-assets"] });
      setSelected(prev => prev?.id === assetId ? { ...prev, status: "rejected" } : prev);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao descartar");
    } finally {
      setActionLoading(false);
    }
  }, [qc]);

  const totalAssets = assets.length;
  const totalImages = assets.filter(a => a.assetType === "image" && a.outputUrl).length;
  const totalApproved = assets.filter(a => a.status === "approved").length;
  const pendingReview = assets.filter(a => a.status === "awaiting_approval").length;

  return (
    <div style={{ minHeight: "100vh", background: "#020617", padding: "24px" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => navigate("/hub/growth")} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "#475569", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 14 }}>
            <ArrowLeft style={{ width: 13, height: 13 }} /> Growth OS
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Sparkles style={{ width: 20, height: 20, color: "#818cf8" }} />
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#f1f5f9", margin: 0 }}>Pilotos Criativos</h1>
            <span style={{ fontSize: 11, background: "#1e1b4b", color: "#818cf8", border: "1px solid #312e81", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>Laboratório editorial</span>
          </div>
          <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
            Assets gerados por AI aguardando revisão · Aprovar envia para a Máquina de Marketing
          </p>
        </div>

        {/* Painel de Geração */}
        <GerarImagemPanel onGenerated={() => qc.invalidateQueries({ queryKey: ["pilotos-assets"] })} />

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { label: "Assets totais",   value: String(totalAssets),   color: "#818cf8" },
            { label: "Imagens prontas", value: String(totalImages),   color: "#22c55e" },
            { label: "Em revisão",      value: String(pendingReview), color: "#f59e0b" },
            { label: "Aprovados",       value: String(totalApproved), color: "#60a5fa" },
          ].map(s => (
            <div key={s.label} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 11, color: "#475569" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Info banner */}
        <div style={{ marginBottom: 20, padding: "10px 16px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <AlertTriangle style={{ width: 14, height: 14, color: "#f59e0b", marginTop: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
            <strong style={{ color: "#94a3b8" }}>Laboratório criativo:</strong> Revise os assets gerados por AI, abra um item para ver imagem + prompt completo e, se aprovado, clique em <strong style={{ color: "#60a5fa" }}>Aprovar e enviar para Campanhas</strong>. O asset aprovado ficará disponível na Máquina de Marketing para publicação no Meta.
          </p>
        </div>

        {/* Conteúdo */}
        {isLoading && (
          <div style={{ padding: 40, textAlign: "center", color: "#334155", fontSize: 13 }}>
            <RefreshCw style={{ width: 20, height: 20, animation: "spin 1s linear infinite", margin: "0 auto 10px" }} />
            <div>Carregando assets…</div>
          </div>
        )}

        {error && (
          <div style={{ padding: "16px 20px", background: "#1c0606", border: "1px solid #991b1b", borderRadius: 10, color: "#ef4444", fontSize: 13 }}>
            Erro ao carregar assets: {error instanceof Error ? error.message : "Erro desconhecido"}
          </div>
        )}

        {!isLoading && !error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {["r2pb", "mirage"].map(tid => (
              <TenantSection
                key={tid}
                tenantId={tid}
                assets={byTenant[tid] ?? []}
                onSelect={setSelected}
              />
            ))}
          </div>
        )}

        {/* Rodapé */}
        <div style={{ marginTop: 20, padding: "10px 16px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <Send style={{ width: 12, height: 12, color: "#334155" }} />
          <p style={{ fontSize: 11, color: "#334155", margin: 0 }}>
            Assets aprovados aqui ficam disponíveis em <strong style={{ color: "#475569" }}>Marketing → Campanhas</strong> para revisão editorial e postagem no Meta.
          </p>
        </div>

      </div>

      {/* Modal de detalhe */}
      {selected && (
        <AssetModal
          asset={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onDiscard={handleDiscard}
          onSyncVideo={(url) => setSelected(prev => prev ? { ...prev, outputUrl: url, status: "awaiting_approval" } : prev)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
