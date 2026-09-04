import { logger } from "./logger";

export type GrowthAssetType = "copy" | "headline" | "script" | "image" | "video" | "cta" | "caption" | "hook";
export type GrowthProviderName = "openai" | "heygen" | "midjourney" | "banana" | "manual";

export type GrowthAssetTypeHint =
  | GrowthAssetType
  | "video_avatar"
  | "image_premium"
  | "image_fast"
  | "image_generic";

export interface ProviderRouteInput {
  assetType: GrowthAssetTypeHint;
  priority?: "quality" | "speed" | "cost" | null;
  tenantId?: string | null;
}

export interface ProviderRouteDecision {
  selectedProvider: GrowthProviderName;
  fallbackProvider: GrowthProviderName | null;
  selectionReason: string;
  providerAvailable: boolean;
  requiresManualReview: boolean;
}

export interface ProviderAvailability {
  openai: boolean;
  heygen: boolean;
  midjourney: boolean;
  banana: boolean;
}

/**
 * Availability is derived from environment configuration:
 * - heygen: requires HEYGEN_API_KEY (real credential, already live)
 * - midjourney: requires explicit MIDJOURNEY_ENABLED="true" (blocked today — no official API,
 *   depends on external Discord/bridge-service setup that hasn't been provisioned yet)
 * - banana: "Banana" = Gemini nano-banana image generation (gemini-2.5-flash-image) via Replit
 *   AI Integrations — available whenever AI_INTEGRATIONS_GEMINI_BASE_URL/API_KEY are provisioned
 *   (no separate BANANA_* secret needed), unless explicitly disabled via BANANA_ENABLED="false"
 * - openai: available by default via Replit AI Integrations, unless explicitly disabled
 */
export function getProviderAvailability(): ProviderAvailability {
  return {
    openai: process.env["OPENAI_ENABLED"] !== "false",
    heygen: Boolean(process.env["HEYGEN_API_KEY"]) && process.env["HEYGEN_ENABLED"] !== "false",
    midjourney: process.env["MIDJOURNEY_ENABLED"] === "true",
    banana:
      Boolean(process.env["AI_INTEGRATIONS_GEMINI_BASE_URL"]) &&
      Boolean(process.env["AI_INTEGRATIONS_GEMINI_API_KEY"]) &&
      process.env["BANANA_ENABLED"] !== "false",
  };
}

function normalizeAssetTypeHint(hint: GrowthAssetTypeHint): {
  category: "video" | "image" | "text";
  assetType: GrowthAssetType;
} {
  switch (hint) {
    case "video":
    case "video_avatar":
      return { category: "video", assetType: "video" };
    case "image":
    case "image_premium":
    case "image_fast":
    case "image_generic":
      return { category: "image", assetType: "image" };
    case "copy":
    case "headline":
    case "script":
    case "cta":
    case "caption":
    case "hook":
      return { category: "text", assetType: hint };
    default:
      return { category: "text", assetType: "copy" };
  }
}

/**
 * Selects the provider for a given asset type, applying the current routing rules:
 *   video / video_avatar        -> heygen
 *   image_premium                -> midjourney (when available), else banana, else manual review
 *   image_fast / image_generic   -> banana (when available), else manual review
 *   copy/headline/script/etc.    -> openai
 */
export function selectGrowthProvider(
  input: ProviderRouteInput,
  availability: ProviderAvailability = getProviderAvailability()
): ProviderRouteDecision {
  const { category } = normalizeAssetTypeHint(input.assetType);

  if (category === "video") {
    return {
      selectedProvider: "heygen",
      fallbackProvider: null,
      selectionReason: availability.heygen
        ? "video/video_avatar roteado para heygen (único provider de vídeo ativo)"
        : "video/video_avatar roteado para heygen, mas credencial HEYGEN_API_KEY ausente — geração vai falhar até configurar",
      providerAvailable: availability.heygen,
      requiresManualReview: !availability.heygen,
    };
  }

  if (category === "image") {
    const wantsPremium = input.assetType === "image_premium" || input.priority === "quality";

    if (wantsPremium) {
      if (availability.midjourney) {
        return {
          selectedProvider: "midjourney",
          fallbackProvider: availability.banana ? "banana" : null,
          selectionReason: "image_premium roteado para midjourney (disponível e configurado)",
          providerAvailable: true,
          requiresManualReview: false,
        };
      }
      if (availability.banana) {
        return {
          selectedProvider: "banana",
          fallbackProvider: null,
          selectionReason: "midjourney indisponível (bloqueado por dependência externa); banana disponível como alternativa de imagem",
          providerAvailable: true,
          requiresManualReview: false,
        };
      }
      return {
        selectedProvider: "manual",
        fallbackProvider: null,
        selectionReason: "midjourney indisponível e banana não configurado — nenhum provider de imagem premium ativo, requer revisão manual",
        providerAvailable: false,
        requiresManualReview: true,
      };
    }

    // image_fast / image_generic / plain "image" without quality priority
    if (availability.banana) {
      return {
        selectedProvider: "banana",
        fallbackProvider: availability.midjourney ? "midjourney" : null,
        selectionReason: "image_fast/image_generic roteado para banana (disponível e configurado)",
        providerAvailable: true,
        requiresManualReview: false,
      };
    }
    if (availability.midjourney) {
      return {
        selectedProvider: "midjourney",
        fallbackProvider: null,
        selectionReason: "banana indisponível; midjourney disponível como alternativa de imagem",
        providerAvailable: true,
        requiresManualReview: false,
      };
    }
    return {
      selectedProvider: "manual",
      fallbackProvider: null,
      selectionReason: "banana indisponível e midjourney não configurado — nenhum provider de imagem ativo, requer revisão manual",
      providerAvailable: false,
      requiresManualReview: true,
    };
  }

  // text-like assets: copy, headline, script, cta, caption, hook
  return {
    selectedProvider: "openai",
    fallbackProvider: null,
    selectionReason: availability.openai
      ? "asset de texto roteado para openai"
      : "asset de texto roteado para openai, mas OPENAI_ENABLED=false — requer revisão manual",
    providerAvailable: availability.openai,
    requiresManualReview: !availability.openai,
  };
}

/**
 * Resolves what to do when a provider that was already selected/attempted fails at runtime.
 * Rules:
 *   - midjourney fails -> try banana if configured, else manual review
 *   - banana fails -> manual review (no further automatic image fallback)
 *   - heygen fails -> no automatic video fallback; mark failed, allow retry/manual
 *   - openai fails -> single retry, then failed (caller is responsible for tracking retry count)
 */
export function resolveGrowthFallback(
  input: ProviderRouteInput,
  failedProvider: GrowthProviderName,
  availability: ProviderAvailability = getProviderAvailability()
): ProviderRouteDecision {
  if (failedProvider === "midjourney") {
    if (availability.banana) {
      return {
        selectedProvider: "banana",
        fallbackProvider: null,
        selectionReason: "midjourney falhou; aplicando fallback para banana",
        providerAvailable: true,
        requiresManualReview: false,
      };
    }
    return {
      selectedProvider: "manual",
      fallbackProvider: null,
      selectionReason: "midjourney falhou e banana não está configurado — requer revisão manual",
      providerAvailable: false,
      requiresManualReview: true,
    };
  }

  if (failedProvider === "banana") {
    return {
      selectedProvider: "manual",
      fallbackProvider: null,
      selectionReason: "banana falhou — sem fallback automático de imagem configurado, requer revisão manual",
      providerAvailable: false,
      requiresManualReview: true,
    };
  }

  if (failedProvider === "heygen") {
    return {
      selectedProvider: "manual",
      fallbackProvider: null,
      selectionReason: "heygen falhou — sem troca automática de provider de vídeo; manter status failed para retry manual",
      providerAvailable: false,
      requiresManualReview: true,
    };
  }

  if (failedProvider === "openai") {
    return {
      selectedProvider: "openai",
      fallbackProvider: null,
      selectionReason: "openai falhou — permitir uma única retentativa antes de marcar como failed",
      providerAvailable: availability.openai,
      requiresManualReview: false,
    };
  }

  logger.warn({ failedProvider, input }, "growthProviderRouter: fallback solicitado para provider desconhecido");
  return {
    selectedProvider: "manual",
    fallbackProvider: null,
    selectionReason: `provider "${failedProvider}" desconhecido — requer revisão manual`,
    providerAvailable: false,
    requiresManualReview: true,
  };
}
